import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';
import { getToken, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!verifyToken(getToken(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const users = await getAllUsers();
    const sorted = users.sort(
      (a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
    );
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}
