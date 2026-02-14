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

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/5d3eae54-90f7-4b9a-b916-82f73d2c9996',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:18',message:'Callback received',data:{hasCode:!!code,hasState:!!state,hasError:!!error,requestUrl:request.url,origin:baseUrl},timestamp:Date.now(),hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion

    if (error) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=no_code`);
    }

    // Validate CSRF state
    const cookieStore = await cookies();
    
    // #region agent log
    const allCookies = cookieStore.getAll().map(c => ({name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0}));
    fetch('http://127.0.0.1:7245/ingest/5d3eae54-90f7-4b9a-b916-82f73d2c9996',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:37',message:'Reading cookies',data:{allCookies,totalCookies:allCookies.length},timestamp:Date.now(),hypothesisId:'A,C,E'})}).catch(()=>{});
    // #endregion
    
    const expectedState = cookieStore.get('monzo_oauth_state')?.value;
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/5d3eae54-90f7-4b9a-b916-82f73d2c9996',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:42',message:'State validation',data:{receivedState:state,expectedState:expectedState,statesMatch:state===expectedState,hasReceivedState:!!state,hasExpectedState:!!expectedState},timestamp:Date.now(),hypothesisId:'A,C,D,E'})}).catch(()=>{});
    // #endregion
    
    if (!state || !expectedState || state !== expectedState) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/5d3eae54-90f7-4b9a-b916-82f73d2c9996',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:48',message:'State validation FAILED',data:{reason:!state?'no_state_param':!expectedState?'no_cookie':'mismatch'},timestamp:Date.now(),hypothesisId:'A,C,D,E'})}).catch(()=>{});
      // #endregion
      return NextResponse.redirect(`${baseUrl}/?auth_error=invalid_state`);
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
