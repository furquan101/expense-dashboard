import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/monzo-auth';

export const dynamic = 'force-dynamic';

/**
 * OAuth callback endpoint
 * Monzo redirects here after user authorizes the app
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json(
        { error: `OAuth error: ${error}` },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Return tokens to user (they need to add these to .env.local)
    return NextResponse.json({
      success: true,
      message: 'Authorization successful! Add these to your .env.local file:',
      tokens: {
        MONZO_ACCESS_TOKEN: tokens.accessToken,
        MONZO_REFRESH_TOKEN: tokens.refreshToken,
        expiresAt: new Date(tokens.expiresAt).toISOString(),
      },
      instructions: [
        '1. Copy the tokens above',
        '2. Add them to your .env.local file:',
        '   MONZO_REFRESH_TOKEN=<refresh_token>',
        '   MONZO_ACCESS_TOKEN=<access_token>',
        '3. Restart your dev server',
        '4. Tokens will now auto-refresh!',
      ],
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
