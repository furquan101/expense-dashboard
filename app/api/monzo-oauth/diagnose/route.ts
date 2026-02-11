import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to check OAuth configuration
 */
export async function GET() {
  const config = {
    clientId: process.env.MONZO_CLIENT_ID,
    clientSecret: process.env.MONZO_CLIENT_SECRET ? '[REDACTED - Present]' : '[MISSING]',
    redirectUri: process.env.MONZO_REDIRECT_URI,
    accessToken: process.env.MONZO_ACCESS_TOKEN ? '[REDACTED - Present]' : '[MISSING]',
    refreshToken: process.env.MONZO_REFRESH_TOKEN ? '[REDACTED - Present]' : '[MISSING]',
  };

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for missing credentials
  if (!process.env.MONZO_CLIENT_ID) {
    issues.push('MONZO_CLIENT_ID is missing');
  }
  if (!process.env.MONZO_CLIENT_SECRET) {
    issues.push('MONZO_CLIENT_SECRET is missing');
  }
  if (!process.env.MONZO_REDIRECT_URI) {
    issues.push('MONZO_REDIRECT_URI is missing');
  }

  // Check redirect URI format
  if (process.env.MONZO_REDIRECT_URI) {
    const uri = process.env.MONZO_REDIRECT_URI;
    if (!uri.startsWith('http://localhost:3000') && !uri.startsWith('https://')) {
      issues.push(`Redirect URI format may be incorrect: ${uri}`);
      recommendations.push('Redirect URI should be: http://localhost:3000/api/monzo-oauth/callback');
    }
    if (!uri.includes('/api/monzo-oauth/callback')) {
      issues.push('Redirect URI path may be incorrect');
      recommendations.push('Redirect URI should end with: /api/monzo-oauth/callback');
    }
  }

  // Check client ID format
  if (process.env.MONZO_CLIENT_ID && !process.env.MONZO_CLIENT_ID.startsWith('oauth2client_')) {
    issues.push('Client ID format looks incorrect (should start with oauth2client_)');
  }

  // Provide recommendations
  if (issues.length === 0) {
    recommendations.push('Configuration looks correct');
    recommendations.push('If OAuth still fails, check Monzo Developer Portal:');
    recommendations.push('1. Verify OAuth client is in "Live" state (not "Test")');
    recommendations.push('2. Verify redirect URI matches EXACTLY: http://localhost:3000/api/monzo-oauth/callback');
    recommendations.push('3. Verify client is associated with your Monzo account');
    recommendations.push('4. Check if you need to re-create the OAuth client');
  }

  return NextResponse.json({
    configuration: config,
    issues: issues.length > 0 ? issues : ['No issues detected'],
    recommendations,
    nextSteps: [
      '1. Visit Monzo Developer Portal: https://developers.monzo.com/',
      '2. Go to "OAuth Clients" or "Clients" section',
      '3. Verify your client configuration matches the settings above',
      '4. If issues persist, delete the old client and create a new one',
      '5. Make sure to use EXACTLY: http://localhost:3000/api/monzo-oauth/callback',
    ],
  });
}
