import { NextRequest, NextResponse } from 'next/server';
import { deleteQuestion } from '@/lib/db';
import { getToken, verifyToken } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyToken(getToken(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    await deleteQuestion(params.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar pregunta' }, { status: 500 });
  }
}
