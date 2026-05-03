import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, saveUserSession, getUserSession } from '@/lib/db';

function isPrivateIp(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.|localhost)/.test(hostname);
  } catch { return true; }
}

async function getOmadaCloudSession(): Promise<string | null> {
  const email = process.env.OMADA_CLOUD_EMAIL;
  const password = process.env.OMADA_CLOUD_PASSWORD;
  if (!email || !password) return null;

  try {
    const res = await fetch('https://use1-omada-cloud.tplinkcloud.com/api/v2/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name: email, password }),
    });
    const text = await res.text();
    console.log('[Omada Cloud] Login response:', res.status, text.slice(0, 200));
    if (!res.ok) return null;
    const cookie = res.headers.get('set-cookie');
    if (cookie) return cookie;
    try {
      const data = JSON.parse(text) as { result?: { token?: string } };
      const token = data.result?.token;
      if (token) return `TPOMADA_SESSIONID=${token}`;
    } catch { /* ignore */ }
    return null;
  } catch (e) {
    console.warn('[Omada Cloud] Cloud login error:', e);
    return null;
  }
}

async function tryPost(
  url: string,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): Promise<{ ok: boolean; text: string; data: Record<string, unknown>; cookies: string | null }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...extraHeaders,
  };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { /* ignore */ }
  return { ok: res.ok, text, data, cookies: res.headers.get('set-cookie') };
}

async function grantOmadaAccess(params: {
  clientMac: string;
  apMac: string;
  ssidName: string;
  radioId: string;
  site: string; // site ID from Omada redirect params
  loginUrl?: string;
}) {
  const controllerId = process.env.OMADA_CONTROLLER_ID;
  const username = process.env.OMADA_USERNAME;
  const password = process.env.OMADA_PASSWORD;

  if (!controllerId || !username || !password) {
    throw new Error('Omada credentials not configured');
  }

  const base = `https://use1-api-omada-controller-connector.tplinkcloud.com/${controllerId}`;
  const siteId = params.site; // e.g. '69ef7391c2742a4b88793b45'

  const cloudCookie = await getOmadaCloudSession();
  console.log('[Omada] siteId:', siteId, '| cloudCookie present:', !!cloudCookie);

  // Step 1: operator login — try site-specific paths first (Omada v6.x requirement)
  const loginCandidates: string[] = [];
  if (params.loginUrl && !isPrivateIp(params.loginUrl)) {
    loginCandidates.push(params.loginUrl);
  }
  if (siteId) {
    loginCandidates.push(`${base}/api/v2/sites/${siteId}/hotspot/extPortal/auth`);
    loginCandidates.push(`${base}/api/v2/${siteId}/hotspot/extPortal/auth`);
  }
  loginCandidates.push(`${base}/api/v2/hotspot/extPortal/auth`);
  loginCandidates.push(`${base}/hotspot/extPortal/auth`);

  console.log('[Omada] login candidates:', loginCandidates);

  let csrfToken: string | null = null;
  let sessionCookies: string | null = null;

  for (const url of loginCandidates) {
    console.log('[Omada] Trying login at:', url);
    const extraHeaders: Record<string, string> = {};
    const cookieHeader = cloudCookie || '';
    if (cookieHeader) extraHeaders['Cookie'] = cookieHeader;

    const { ok, text, data, cookies } = await tryPost(url, { name: username, password }, extraHeaders);
    console.log('[Omada] Login response:', text.slice(0, 300));

    const token = (data as { result?: { token?: string } }).result?.token;
    const errorCode = (data as { errorCode?: number }).errorCode;

    if (token) {
      csrfToken = token;
      sessionCookies = cookies;
      console.log('[Omada] Operator login SUCCESS at:', url);
      break;
    }

    console.warn(`[Omada] Login failed at ${url} — errorCode=${errorCode}, ok=${ok}`);
  }

  if (!csrfToken) {
    throw new Error(`Operator login failed on all endpoints. siteId="${siteId}", loginUrl="${params.loginUrl}"`);
  }

  // Step 2: authorize client — also try site-specific paths
  const cookieParts = [cloudCookie, sessionCookies].filter(Boolean);
  const authCookie = cookieParts.join('; ');
  const authExtraHeaders: Record<string, string> = { 'Csrf-Token': csrfToken };
  if (authCookie) authExtraHeaders['Cookie'] = authCookie;

  const authBody = {
    clientMac: params.clientMac,
    apMac: params.apMac,
    ssidName: params.ssidName,
    radioId: parseInt(params.radioId) || 0,
    site: siteId || process.env.OMADA_SITE_NAME || 'Default',
    time: 86400,
    authType: 4,
  };

  const authCandidates: string[] = [];
  if (siteId) {
    authCandidates.push(`${base}/api/v2/sites/${siteId}/hotspot/login`);
    authCandidates.push(`${base}/api/v2/${siteId}/hotspot/login`);
  }
  authCandidates.push(`${base}/api/v2/hotspot/login`);

  for (const url of authCandidates) {
    console.log('[Omada] Trying authorize at:', url, JSON.stringify(authBody));
    const { ok, text, data } = await tryPost(url, authBody, authExtraHeaders);
    console.log('[Omada] Authorize response:', text.slice(0, 300));

    const errorCode = (data as { errorCode?: number }).errorCode;
    if (errorCode === 0 || (ok && errorCode === undefined)) {
      console.log('[Omada] Access GRANTED for', params.clientMac);
      return;
    }

    console.warn(`[Omada] Authorize failed at ${url} — errorCode=${errorCode}, ok=${ok}`);
    if (errorCode === 0) break; // shouldn't happen but guard
  }

  throw new Error(`Authorize failed on all endpoints for clientMac=${params.clientMac}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mac, name, email, phone, answers, apMac, ssidName, radioId, site, loginUrl } = body;

    console.log('[Submit] params:', { mac, apMac, ssidName, radioId, site, loginUrl: loginUrl || '(none)' });

    if (!mac || !name || !email || !phone || !answers) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const allQuestions = await getQuestions();

    let correctCount = 0;
    for (const answer of answers) {
      const question = allQuestions.find(q => q.id === answer.questionId);
      if (question) {
        const correctText = question.options[question.correctAnswer];
        if (correctText === answer.selectedText) {
          correctCount++;
        }
      }
    }

    const session = await getUserSession(mac);
    const totalAttempts = session ? session.totalAttempts + 1 : 1;
    const passed = correctCount >= 3;

    if (passed) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      try {
        await saveUserSession({
          mac, name, email, phone,
          connectedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          correctAnswers: correctCount,
          totalAttempts,
        });
      } catch (e) {
        console.error('KV save failed (non-fatal):', e);
      }

      let omadaGranted = false;
      let omadaError = '';
      try {
        await grantOmadaAccess({
          clientMac: mac,
          apMac: apMac || '',
          ssidName: ssidName || '',
          radioId: radioId || '0',
          site: site || '',
          loginUrl: loginUrl || '',
        });
        omadaGranted = true;
      } catch (e) {
        omadaError = String(e);
        console.error('[Omada] Final error:', e);
      }

      return NextResponse.json({
        passed: true,
        correctAnswers: correctCount,
        totalQuestions: answers.length,
        message: 'Respondiste correctamente. ¡Ya podés navegar!',
        expiresAt: expiresAt.toISOString(),
        omadaGranted,
        omadaError: omadaGranted ? undefined : omadaError,
      });
    }

    return NextResponse.json({
      passed: false,
      correctAnswers: correctCount,
      totalQuestions: answers.length,
      message: `Necesitás al menos 3 respuestas correctas. Obtuviste ${correctCount}.`,
      attemptsCount: totalAttempts,
    });
  } catch (error) {
    console.error('Error al procesar quiz:', error);
    return NextResponse.json({ error: 'Error al procesar el quiz' }, { status: 500 });
  }
}
