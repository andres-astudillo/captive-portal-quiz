import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, saveUserSession, getUserSession } from '@/lib/db';

async function grantOmadaAccess(params: {
  clientMac: string;
  apMac: string;
  ssidName: string;
  radioId: string;
  site: string;
}) {
  const controllerId = process.env.OMADA_CONTROLLER_ID;
  const username = process.env.OMADA_USERNAME;
  const password = process.env.OMADA_PASSWORD;

  if (!controllerId || !username || !password) {
    throw new Error('Omada credentials not configured');
  }

  const baseUrl = `https://use1-omada-cloud.tplinkcloud.com/${controllerId}`;

  // Paso 1: Login como operador para obtener token CSRF
  const loginRes = await fetch(`${baseUrl}/api/v2/hotspot/extPortal/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ name: username, password }),
  });

  const loginText = await loginRes.text();
  if (!loginRes.ok) {
    throw new Error(`Omada login failed: ${loginRes.status} - ${loginText}`);
  }

  const loginData = JSON.parse(loginText);
  const csrfToken = loginData.result?.token;
  const sessionCookies = loginRes.headers.get('set-cookie');

  if (!csrfToken) {
    throw new Error(`No CSRF token from Omada. Response: ${loginText}`);
  }

  // Paso 2: Autorizar el cliente
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Csrf-Token': csrfToken,
  };
  if (sessionCookies) authHeaders['Cookie'] = sessionCookies;

  const authBody = {
    clientMac: params.clientMac,
    apMac: params.apMac,
    ssidName: params.ssidName,
    radioId: parseInt(params.radioId) || 0,
    site: params.site || process.env.OMADA_SITE_NAME || 'Default',
    time: 604800, // 7 días en segundos
    authType: 4,
  };

  const authRes = await fetch(`${baseUrl}/api/v2/hotspot/login`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(authBody),
  });

  const authText = await authRes.text();
  if (!authRes.ok) {
    throw new Error(`Omada grant access failed: ${authRes.status} - ${authText}`);
  }

  console.log('Omada access granted:', authText);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mac, name, email, phone, answers, apMac, ssidName, radioId, site } = body;

    if (!mac || !name || !email || !phone || !answers) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const allQuestions = await getQuestions();

    let correctCount = 0;
    for (const answer of answers) {
      const question = allQuestions.find(q => q.id === answer.questionId);
      if (question && question.correctAnswer === answer.selectedAnswer) {
        correctCount++;
      }
    }

    const session = await getUserSession(mac);
    const totalAttempts = session ? session.totalAttempts + 1 : 1;
    const passed = correctCount >= 3;

    if (passed) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Guardar sesión en KV (no bloquea si falla)
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

      // Autorizar cliente en Omada (no bloquea si falla)
      let omadaGranted = false;
      try {
        await grantOmadaAccess({
          clientMac: mac,
          apMac: apMac || '',
          ssidName: ssidName || '',
          radioId: radioId || '0',
          site: site || '',
        });
        omadaGranted = true;
      } catch (e) {
        console.error('Omada grant access failed (non-fatal):', e);
      }

      return NextResponse.json({
        passed: true,
        correctAnswers: correctCount,
        totalQuestions: answers.length,
        message: 'Respondiste correctamente. ¡Ya podés navegar!',
        expiresAt: expiresAt.toISOString(),
        omadaGranted,
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
