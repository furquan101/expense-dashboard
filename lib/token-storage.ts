import { cookies } from 'next/headers';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || '';
const COOKIE_PREFIX = 'monzo_';
const ACCESS_TOKEN_COOKIE = `${COOKIE_PREFIX}at`;
const REFRESH_TOKEN_COOKIE = `${COOKIE_PREFIX}rt`;
const EXPIRES_AT_COOKIE = `${COOKIE_PREFIX}exp`;

function getKey(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be at least 32 hex characters');
  }
  return Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'hex');
}

function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.concat([key, key], 32), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(data: string): string {
  const key = getKey();
  const buf = Buffer.from(data, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.concat([key, key], 32), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function saveTokensToCookies(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + expiresIn * 1000;
  const maxAge = 90 * 24 * 60 * 60; // 90 days (refresh token lifetime)

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };

  cookieStore.set(ACCESS_TOKEN_COOKIE, encrypt(accessToken), cookieOptions);
  cookieStore.set(REFRESH_TOKEN_COOKIE, encrypt(refreshToken), cookieOptions);
  cookieStore.set(EXPIRES_AT_COOKIE, encrypt(String(expiresAt)), cookieOptions);
}

export async function getTokensFromCookies(): Promise<StoredTokens | null> {
  try {
    const cookieStore = await cookies();
    const atCookie = cookieStore.get(ACCESS_TOKEN_COOKIE);
    const rtCookie = cookieStore.get(REFRESH_TOKEN_COOKIE);
    const expCookie = cookieStore.get(EXPIRES_AT_COOKIE);

    if (!atCookie?.value || !rtCookie?.value || !expCookie?.value) {
      return null;
    }

    return {
      accessToken: decrypt(atCookie.value),
      refreshToken: decrypt(rtCookie.value),
      expiresAt: parseInt(decrypt(expCookie.value), 10),
    };
  } catch {
    return null;
  }
}

export async function clearTokenCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(EXPIRES_AT_COOKIE);
}
