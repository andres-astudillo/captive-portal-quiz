import { NextRequest, NextResponse } from 'next/server';
import { deleteQuestion } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteQuestion(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar pregunta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar pregunta' },
      { status: 500 }
    );
  }
}
