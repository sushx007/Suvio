import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function getUserFromCookies() {
  const store = await cookies();
  const token = store.get('suvio_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded;
}

export async function getUserFromRequest(request) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/suvio_token=([^;]+)/);
  if (!match) return null;
  return verifyToken(match[1]);
}
