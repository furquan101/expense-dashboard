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

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: 'OAuth not configured',
        message: 'Missing MONZO_CLIENT_ID or MONZO_CLIENT_SECRET environment variables.',
      }, { status: 500 });
    }

    // Detect redirect URI dynamically based on current host
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const redirectUri = `${baseUrl}/api/monzo-oauth/callback`;

    console.log(`OAuth setup: Using redirect URI: ${redirectUri}`);

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

    // Store redirect URI in cookie for callback to use
    cookieStore.set('monzo_redirect_uri', redirectUri, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    const authUrl = getAuthorizationUrl(state, redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
