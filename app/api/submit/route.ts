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

  // Try Omada Cloud login to get a session cookie for the connector
  const loginUrl = `https://use1-omada-cloud.tplinkcloud.com/api/v2/user/login`;
  console.log('[Omada Cloud] Attempting cloud login for:', email);

  try {
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ name: email, password }),
    });
    const text = await res.text();
    console.log('[Omada Cloud] Login response status:', res.status, text.slice(0, 300));

    if (!res.ok) return null;

    // Return Set-Cookie header to pass to connector requests
    const cookie = res.headers.get('set-cookie');
    if (cookie) {
      console.log('[Omada Cloud] Got cloud session cookie');
      return cookie;
    }

    // Maybe the token is in the body
    try {
      const data = JSON.parse(text) as { result?: { token?: string; sessionId?: string } };
      const token = data.result?.token || data.result?.sessionId;
      if (token) {
        console.log('[Omada Cloud] Got cloud token from body');
        return `TPOMADA_SESSIONID=${token}`;
      }
    } catch { /* ignore */ }

    return null;
  } catch (e) {
    console.warn('[Omada Cloud] Cloud login failed:', e);
    return null;
  }
}

async function tryOperatorLogin(
  url: string,
  username: string,
  password: string,
  cloudCookie?: string | null,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (cloudCookie) headers['Cookie'] = cloudCookie;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: username, password }),
  });
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
  site: string;
  loginUrl?: string;
}) {
  const controllerId = process.env.OMADA_CONTROLLER_ID;
  const username = process.env.OMADA_USERNAME;
  const password = process.env.OMADA_PASSWORD;

  if (!controllerId || !username || !password) {
    throw new Error('Omada credentials not configured');
  }

  const connectorBase = `https://use1-api-omada-controller-connector.tplinkcloud.com/${controllerId}`;

  // Get cloud session (needed for cloud connector auth)
  const cloudCookie = await getOmadaCloudSession();

  // Build a prioritized list of step-1 (operator login) URLs to try
  const step1Candidates: string[] = [];
  if (params.loginUrl && !isPrivateIp(params.loginUrl)) {
    step1Candidates.push(params.loginUrl);
  }
  step1Candidates.push(`${connectorBase}/api/v2/hotspot/extPortal/auth`);
  step1Candidates.push(`${connectorBase}/hotspot/extPortal/auth`);

  console.log('[Omada] loginUrl from client:', params.loginUrl || '(empty)');
  console.log('[Omada] cloudCookie present:', !!cloudCookie);

  let csrfToken: string | null = null;
  let sessionCookies: string | null = null;

  for (const url of step1Candidates) {
    console.log('[Omada] Trying operator login at:', url);
    const { ok, text, data, cookies } = await tryOperatorLogin(url, username, password, cloudCookie);
    console.log('[Omada] Login response:', text.slice(0, 400));

    const token = (data as { result?: { token?: string } }).result?.token;
    const errorCode = (data as { errorCode?: number }).errorCode;

    if (token) {
      csrfToken = token;
      sessionCookies = cookies;
      console.log('[Omada] Operator login success at:', url);
      break;
    }

    if (!ok) {
      console.warn(`[Omada] Login HTTP error at ${url}: ${text.slice(0, 200)}`);
    } else {
      console.warn(`[Omada] Login errorCode ${errorCode} at ${url}`);
    }
  }

  if (!csrfToken) {
    throw new Error(
      `Operator login failed on all endpoints. loginUrl="${params.loginUrl}", cloudCookie=${!!cloudCookie}`,
    );
  }

  // Paso 2: Autorizar el cliente
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Csrf-Token': csrfToken,
    'X-Requested-With': 'XMLHttpRequest',
  };
  // Merge cookies: cloud cookie + operator session cookie
  const cookieHeader = [cloudCookie, sessionCookies].filter(Boolean).join('; ');
  if (cookieHeader) authHeaders['Cookie'] = cookieHeader;

  const authBody = {
    clientMac: params.clientMac,
    apMac: params.apMac,
    ssidName: params.ssidName,
    radioId: parseInt(params.radioId) || 0,
    site: params.site || process.env.OMADA_SITE_NAME || 'Default',
    time: 86400,
    authType: 4,
  };

  const authRes = await fetch(`${connectorBase}/api/v2/hotspot/login`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(authBody),
  });

  const authText = await authRes.text();
  console.log('[Omada] Authorize response:', authText.slice(0, 400));

  if (!authRes.ok) {
    throw new Error(`Omada authorize failed: ${authRes.status} - ${authText}`);
  }

  const authData = JSON.parse(authText) as { errorCode?: number };
  if (authData.errorCode !== undefined && authData.errorCode !== 0) {
    throw new Error(`Omada authorize errorCode ${authData.errorCode}: ${authText}`);
  }

  console.log('[Omada] Access granted for', params.clientMac);
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
        console.error('Omada grant access failed (non-fatal):', e);
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
