import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/monzo-auth';
import { saveTokensToCookies } from '@/lib/token-storage';

export const dynamic = 'force-dynamic';

/**
 * OAuth callback endpoint
 * Monzo redirects here after user authorizes the app.
 * Saves tokens to encrypted cookies and redirects to dashboard.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const baseUrl = new URL(request.url).origin;
    
    console.error('[OAuth Debug] Callback received:', {
      hasCode: !!code,
      hasState: !!state,
      statePreview: state ? state.substring(0, 8) + '...' : null,
      hasError: !!error,
      requestUrl: request.url,
      origin: baseUrl
    });

    if (error) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=no_code`);
    }

    // Validate CSRF state
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const expectedState = cookieStore.get('monzo_oauth_state')?.value;
    
    // Debug logging
    console.error('[OAuth Debug] Callback state validation:', {
      receivedState: state,
      expectedState: expectedState,
      hasReceivedState: !!state,
      hasExpectedState: !!expectedState,
      statesMatch: state === expectedState,
      allCookieNames: allCookies.map(c => c.name),
      totalCookies: allCookies.length,
      requestUrl: request.url,
      origin: baseUrl
    });
    
    if (!state || !expectedState || state !== expectedState) {
      const reason = !state ? 'no_state_param' : !expectedState ? 'no_cookie' : 'mismatch';
      console.error('[OAuth Debug] State validation FAILED:', reason);
      
      // Return detailed error for debugging
      return NextResponse.json({
        error: 'invalid_state',
        debug: {
          reason,
          receivedState: state ? state.substring(0, 8) + '...' : null,
          expectedState: expectedState ? expectedState.substring(0, 8) + '...' : null,
          cookiesFound: allCookies.map(c => c.name)
        }
      }, { status: 400 });
    }

    // Clear the state cookie
    cookieStore.delete('monzo_oauth_state');

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Save tokens to encrypted cookies
    const expiresIn = Math.floor((tokens.expiresAt - Date.now()) / 1000);
    await saveTokensToCookies(tokens.accessToken, tokens.refreshToken, expiresIn);

    // Redirect to dashboard
    return NextResponse.redirect(`${baseUrl}/?connected=true`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = new URL(request.url).origin;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(message)}`);
  }
}
