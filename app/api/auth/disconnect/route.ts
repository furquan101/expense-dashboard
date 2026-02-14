import { NextResponse } from 'next/server';
import { clearTokenCookies } from '@/lib/token-storage';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearTokenCookies();
  return NextResponse.json({ disconnected: true });
}
