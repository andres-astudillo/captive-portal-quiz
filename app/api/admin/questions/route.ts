import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, saveQuestion, deleteQuestion } from '@/lib/db';
import { getToken, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!verifyToken(getToken(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const questions = await getQuestions();
    return NextResponse.json(questions);
  } catch {
    return NextResponse.json({ error: 'Error al obtener preguntas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyToken(getToken(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const question = await request.json();
    if (!question.question || !question.options || question.options.length < 2) {
      return NextResponse.json({ error: 'Datos de pregunta inválidos' }, { status: 400 });
    }
    if (!question.id) {
      question.id = Date.now().toString();
    }
    await saveQuestion(question);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al guardar pregunta' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyToken(getToken(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }
    await deleteQuestion(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar pregunta' }, { status: 500 });
  }
}
