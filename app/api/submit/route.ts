import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, saveUserSession, getUserSession } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mac, name, email, phone, answers } = body;

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

      // Guardar en KV sin bloquear la respuesta si falla
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

      return NextResponse.json({
        passed: true,
        correctAnswers: correctCount,
        totalQuestions: answers.length,
        message: 'Respondiste correctamente. ¡Ya podés navegar!',
        expiresAt: expiresAt.toISOString(),
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
