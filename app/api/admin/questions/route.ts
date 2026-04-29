import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, saveQuestion, deleteQuestion } from '@/lib/db';

// GET - Obtener todas las preguntas
export async function GET() {
  try {
    const questions = await getQuestions();
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    return NextResponse.json(
      { error: 'Error al obtener preguntas' },
      { status: 500 }
    );
  }
}

// POST - Crear/actualizar pregunta
export async function POST(request: NextRequest) {
  try {
    const question = await request.json();
    
    // Validar datos
    if (!question.question || !question.options || question.options.length < 2) {
      return NextResponse.json(
        { error: 'Datos de pregunta inválidos' },
        { status: 400 }
      );
    }
    
    // Si no tiene ID, generar uno nuevo
    if (!question.id) {
      question.id = Date.now().toString();
    }
    
    await saveQuestion(question);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al guardar pregunta:', error);
    return NextResponse.json(
      { error: 'Error al guardar pregunta' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar pregunta
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de pregunta requerido' },
        { status: 400 }
      );
    }
    
    await deleteQuestion(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar pregunta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar pregunta' },
      { status: 500 }
    );
  }
}
