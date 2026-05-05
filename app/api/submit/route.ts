import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, saveUserSession, getUserSession } from '@/lib/db';
import { authorizeClient } from '@/lib/omada';

/**
 * POST /api/submit
 *
 * Receives the quiz answers + Omada redirect params from the client.
 * If the user passed (>=3 correct), authorizes the client MAC via Omada Open API
 * so the gateway lets it through to the internet.
 *
 * Required env vars (see lib/omada.ts):
 *   OMADA_OPENAPI_BASE_URL, OMADA_CLIENT_ID, OMADA_CLIENT_SECRET,
 *   OMADAC_ID, OMADA_SITE_ID
 *
 * Note: OMADA_SITE_ID is the controller's site UUID. We fall back to the `site`
 * param sent by Omada in the redirect, but pinning it via env var is safer.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mac,
      name,
      email,
      phone,
      answers,
      apMac,
      ssidName,
      radioId,
      site, // siteId from Omada redirect — used as fallback only
    } = body as {
      mac?: string;
      name?: string;
      email?: string;
      phone?: string;
      answers?: { questionId: string; selectedAnswer: number; selectedText: string }[];
      apMac?: string;
      ssidName?: string;
      radioId?: string | number;
      site?: string;
    };

    console.log('[Submit] params:', { mac, apMac, ssidName, radioId, site });

    if (!mac || !name || !email || !phone || !answers) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Score the quiz against the question bank (server-side authoritative).
    const allQuestions = await getQuestions();
    let correctCount = 0;
    for (const a of answers) {
      const q = allQuestions.find((q) => q.id === a.questionId);
      if (q && q.options[q.correctAnswer] === a.selectedText) correctCount++;
    }

    const session = await getUserSession(mac);
    const totalAttempts = session ? session.totalAttempts + 1 : 1;
    const passed = correctCount >= 3;

    if (!passed) {
      return NextResponse.json({
        passed: false,
        correctAnswers: correctCount,
        totalQuestions: answers.length,
        message: `Necesitás al menos 3 respuestas correctas. Obtuviste ${correctCount}.`,
        attemptsCount: totalAttempts,
      });
    }

    // Persist the session (KV is non-fatal — keep going even if it fails).
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    try {
      await saveUserSession({
        mac,
        name,
        email,
        phone,
        connectedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        correctAnswers: correctCount,
        totalAttempts,
      });
    } catch (e) {
      console.error('KV save failed (non-fatal):', e);
    }

    // Authorize the client via Omada Open API.
    let omadaGranted = false;
    let omadaError: string | undefined;
    try {
      // Allow runtime override of siteId via Omada redirect param if env is missing.
      if (!process.env.OMADA_SITE_ID && site) {
        process.env.OMADA_SITE_ID = site;
      }
      await authorizeClient({
        clientMac: mac,
        apMac: apMac || '',
        ssidName: ssidName || '',
        radioId: typeof radioId === 'number' ? radioId : parseInt(String(radioId ?? '0'), 10) || 0,
        time: 24 * 60 * 60, // 1 day
        authType: 4, // External Portal Server
      });
      omadaGranted = true;
    } catch (e) {
      omadaError = e instanceof Error ? e.message : String(e);
      console.error('[Omada] Authorize error:', omadaError);
    }

    return NextResponse.json({
      passed: true,
      correctAnswers: correctCount,
      totalQuestions: answers.length,
      message: omadaGranted
        ? 'Respondiste correctamente. ¡Ya podés navegar!'
        : 'Quiz aprobado, pero hubo un problema al habilitar internet. Reintentá en unos segundos.',
      expiresAt: expiresAt.toISOString(),
      omadaGranted,
      omadaError, // surface in the UI / debug page when present
    });
  } catch (error) {
    console.error('Error al procesar quiz:', error);
    return NextResponse.json({ error: 'Error al procesar el quiz' }, { status: 500 });
  }
}
