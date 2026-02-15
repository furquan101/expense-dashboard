import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getAuthorizationUrl } from '@/lib/monzo-auth';

export const dynamic = 'force-dynamic';

/**
 * Setup endpoint - redirects user directly to Monzo OAuth
 */
export async function GET(request: Request) {
  try {
    const clientId = process.env.MONZO_CLIENT_ID;
    const clientSecret = process.env.MONZO_CLIENT_SECRET;
    const redirectUri = process.env.MONZO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({
        error: 'OAuth not configured',
        message: 'Missing MONZO_CLIENT_ID, MONZO_CLIENT_SECRET, or MONZO_REDIRECT_URI environment variables.',
      }, { status: 500 });
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in cookie for validation in callback
    const cookieStore = await cookies();
    cookieStore.set('monzo_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    const authUrl = getAuthorizationUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
