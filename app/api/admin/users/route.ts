import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';

export async function GET() {
  try {
    const users = await getAllUsers();
    
    // Ordenar por fecha de conexión (más reciente primero)
    const sorted = users.sort((a, b) => 
      new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
    );
    
    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
