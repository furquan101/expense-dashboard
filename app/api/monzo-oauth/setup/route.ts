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
    
    console.error('[OAuth Debug] Setup - generating state:', {
      state: state.substring(0, 8) + '...',
      nodeEnv: process.env.NODE_ENV,
      requestUrl: request.url
    });

    // Store state in cookie for validation in callback
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 600, // 10 minutes
    };
    
    cookieStore.set('monzo_oauth_state', state, cookieOptions);
    
    console.error('[OAuth Debug] Setup - state cookie set:', {
      cookieName: 'monzo_oauth_state',
      options: cookieOptions
    });

    const authUrl = getAuthorizationUrl(state);
    
    console.error('[OAuth Debug] Setup - redirecting to Monzo:', {
      authUrlDomain: new URL(authUrl).hostname,
      stateInUrl: authUrl.includes(state)
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
