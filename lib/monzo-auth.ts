/**
 * Monzo OAuth2 Token Management
 * Handles automatic token refresh using refresh tokens
 */

interface MonzoTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenStorage {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

// In production, store this in a database or secure storage
// For now, we'll use a simple in-memory cache + env vars
let tokenCache: TokenStorage | null = null;

const MONZO_CLIENT_ID = process.env.MONZO_CLIENT_ID || '';
const MONZO_CLIENT_SECRET = process.env.MONZO_CLIENT_SECRET || '';
const MONZO_REDIRECT_URI = process.env.MONZO_REDIRECT_URI || '';

/**
 * Exchange authorization code for tokens (one-time setup)
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenStorage> {
  const response = await fetch('https://api.monzo.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: MONZO_CLIENT_ID,
      client_secret: MONZO_CLIENT_SECRET,
      redirect_uri: MONZO_REDIRECT_URI,
      code: code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const tokens: MonzoTokens = await response.json();

  const storage: TokenStorage = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in * 1000),
  };

  tokenCache = storage;
  return storage;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenStorage> {
  console.log('Refreshing Monzo access token...');

  const response = await fetch('https://api.monzo.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: MONZO_CLIENT_ID,
      client_secret: MONZO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const tokens: MonzoTokens = await response.json();

  const storage: TokenStorage = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in * 1000),
  };

  tokenCache = storage;
  console.log('Token refreshed successfully, expires at:', new Date(storage.expiresAt));

  return storage;
}

/**
 * Get valid access token (refreshes if expired)
 */
export async function getValidAccessToken(): Promise<string> {
  // Try to use environment variable tokens first
  const envRefreshToken = process.env.MONZO_REFRESH_TOKEN;
  const envAccessToken = process.env.MONZO_ACCESS_TOKEN;

  // Initialize cache from env vars if not set
  if (!tokenCache && envRefreshToken && envAccessToken) {
    tokenCache = {
      accessToken: envAccessToken,
      refreshToken: envRefreshToken,
      expiresAt: Date.now() + (5 * 60 * 60 * 1000), // Assume 5 hours if unknown
    };
  }

  if (!tokenCache) {
    throw new Error('No Monzo tokens configured. Please set MONZO_REFRESH_TOKEN in .env.local');
  }

  // Check if token is expired or will expire in next 5 minutes
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);

  if (tokenCache.expiresAt < fiveMinutesFromNow) {
    console.log('Access token expired or expiring soon, refreshing...');
    tokenCache = await refreshAccessToken(tokenCache.refreshToken);
  }

  return tokenCache.accessToken;
}

/**
 * Get OAuth authorization URL for initial setup
 */
export function getAuthorizationUrl(state: string = 'random_state'): string {
  const params = new URLSearchParams({
    client_id: MONZO_CLIENT_ID,
    redirect_uri: MONZO_REDIRECT_URI,
    response_type: 'code',
    state: state,
  });

  return `https://auth.monzo.com/?${params.toString()}`;
}

/**
 * Initialize token storage from environment variables
 */
export function initializeTokens(): void {
  const refreshToken = process.env.MONZO_REFRESH_TOKEN;
  const accessToken = process.env.MONZO_ACCESS_TOKEN;

  if (refreshToken && accessToken) {
    tokenCache = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (5 * 60 * 60 * 1000), // Assume 5 hours
    };
    console.log('Monzo tokens initialized from environment');
  }
}
