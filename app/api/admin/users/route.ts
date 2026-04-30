import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, deleteUserSession, deleteAllUsers } from '@/lib/db';
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

export async function DELETE(request: NextRequest) {
  if (!verifyToken(getToken(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');
    if (mac === 'all') {
      await deleteAllUsers();
    } else if (mac) {
      await deleteUserSession(mac);
    } else {
      return NextResponse.json({ error: 'MAC requerida' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
