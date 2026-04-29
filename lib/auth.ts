import crypto from 'crypto';

const SECRET = process.env.ADMIN_SECRET || 'fallback-secret-change-in-production';

export function generateToken(email: string): string {
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  const data = `${email}|${expires}`;
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  return Buffer.from(`${data}|${sig}`).toString('base64');
}

export function verifyToken(token: string | null): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const lastPipe = decoded.lastIndexOf('|');
    const data = decoded.slice(0, lastPipe);
    const sig = decoded.slice(lastPipe + 1);
    const pipeIdx = data.indexOf('|');
    const expires = parseInt(data.slice(pipeIdx + 1));
    if (Date.now() > expires) return false;
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}
