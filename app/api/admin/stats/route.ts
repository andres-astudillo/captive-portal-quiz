import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/db';
import { getToken, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!verifyToken(getToken(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
