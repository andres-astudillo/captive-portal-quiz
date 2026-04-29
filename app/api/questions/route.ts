import { NextRequest, NextResponse } from 'next/server';
import { getRandomQuestions } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '1');
    
    const questions = await getRandomQuestions(count);
    
    const safeQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      category: q.category,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? '',
    }));

    return NextResponse.json(safeQuestions);
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    return NextResponse.json(
      { error: 'Error al obtener preguntas' },
      { status: 500 }
    );
  }
}
