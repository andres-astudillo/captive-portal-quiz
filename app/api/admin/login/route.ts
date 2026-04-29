import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const validEmail = process.env.ADMIN_EMAIL || '';
    const validPassword = process.env.ADMIN_PASSWORD || '';

    if (email !== validEmail || password !== validPassword) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const token = generateToken(email);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
