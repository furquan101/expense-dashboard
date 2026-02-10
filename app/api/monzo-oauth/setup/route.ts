import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/monzo-auth';

export const dynamic = 'force-dynamic';

/**
 * Setup endpoint - provides OAuth authorization URL
 */
export async function GET() {
  try {
    const clientId = process.env.MONZO_CLIENT_ID;
    const clientSecret = process.env.MONZO_CLIENT_SECRET;
    const redirectUri = process.env.MONZO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({
        error: 'OAuth not configured',
        message: 'Please add these to your .env.local file:',
        required: [
          'MONZO_CLIENT_ID=your_client_id',
          'MONZO_CLIENT_SECRET=your_client_secret',
          'MONZO_REDIRECT_URI=http://localhost:3000/api/monzo-oauth/callback',
        ],
        instructions: [
          '1. Create a Monzo OAuth client at https://developers.monzo.com/',
          '2. Set redirect URI to: http://localhost:3000/api/monzo-oauth/callback',
          '3. Add the credentials to .env.local',
          '4. Restart your dev server',
        ],
      });
    }

    const authUrl = getAuthorizationUrl();

    return NextResponse.json({
      success: true,
      message: 'Visit this URL to authorize your Monzo account:',
      authorizationUrl: authUrl,
      instructions: [
        '1. Click the authorization URL above',
        '2. Log in to Monzo and authorize the app',
        '3. You will be redirected back with your tokens',
        '4. Copy the tokens to your .env.local file',
        '5. Restart your dev server',
      ],
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
