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
      message: '✅ Authorization successful! Add these to your .env.local file:',
      tokens: {
        MONZO_ACCESS_TOKEN: tokens.accessToken,
        MONZO_REFRESH_TOKEN: tokens.refreshToken,
        expiresAt: new Date(tokens.expiresAt).toISOString(),
      },
      envFormat: {
        note: 'Copy these lines to your .env.local file:',
        lines: [
          `MONZO_ACCESS_TOKEN=${tokens.accessToken}`,
          `MONZO_REFRESH_TOKEN=${tokens.refreshToken}`,
        ],
      },
      instructions: [
        '1. Copy both tokens above',
        '2. Open /Users/furquan.ahmad/expense-dashboard/.env.local',
        '3. Replace MONZO_ACCESS_TOKEN and MONZO_REFRESH_TOKEN values',
        '4. Save the file',
        '5. Restart your dev server (Ctrl+C, then npm run dev)',
        '6. Tokens will now auto-refresh every ~5 hours!',
      ],
      verification: [
        'After restarting, test with:',
        'curl http://localhost:3000/api/monzo-debug',
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
