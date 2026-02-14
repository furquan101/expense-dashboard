import { NextResponse } from 'next/server';
import { hasValidTokens } from '@/lib/monzo-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const connected = await hasValidTokens();
  return NextResponse.json({ connected });
}
