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
      configuration: {
        clientId: clientId,
        redirectUri: redirectUri,
        note: 'These must match EXACTLY in your Monzo Developer Portal',
      },
      instructions: [
        '1. FIRST: Verify OAuth client setup at https://developers.monzo.com/',
        '   - Check client status is "Live"',
        '   - Check redirect URI matches: ' + redirectUri,
        '   - Check client type is "Confidential" for refresh tokens',
        '2. Click the authorization URL above',
        '3. Check your email for Monzo verification link',
        '4. Open Monzo app on your phone for notification',
        '5. Authorize with PIN/Fingerprint/Face ID',
        '6. You will be redirected back with your tokens',
        '7. Copy BOTH tokens to your .env.local file',
        '8. Restart your dev server',
      ],
      troubleshooting: [
        'If you get "couldn\'t identify" error:',
        '- OAuth client may not be properly activated',
        '- Try deleting and recreating the OAuth client',
        '- See MONZO_OAUTH_FIX.md for detailed guide',
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
