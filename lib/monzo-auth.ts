/**
 * Monzo OAuth2 Token Management
 * Handles automatic token refresh using refresh tokens.
 * Reads tokens from encrypted cookies first, then falls back to env vars.
 */

import { getTokensFromCookies, saveTokensToCookies } from './token-storage';

interface MonzoTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface TokenStorage {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

// In-memory cache for the current request lifecycle
let tokenCache: TokenStorage | null = null;

const MONZO_CLIENT_ID = process.env.MONZO_CLIENT_ID || '';
const MONZO_CLIENT_SECRET = process.env.MONZO_CLIENT_SECRET || '';
const MONZO_REDIRECT_URI = process.env.MONZO_REDIRECT_URI || '';

/**
 * Exchange authorization code for tokens (one-time setup)
 */
export async function exchangeCodeForTokens(code: string, redirectUri?: string): Promise<TokenStorage> {
  const response = await fetch('https://api.monzo.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: MONZO_CLIENT_ID,
      client_secret: MONZO_CLIENT_SECRET,
      redirect_uri: redirectUri || MONZO_REDIRECT_URI,
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

  // Persist refreshed tokens back to cookies
  try {
    await saveTokensToCookies(storage.accessToken, storage.refreshToken, tokens.expires_in);
  } catch {
    // Cookie update may fail in some contexts, that's ok - in-memory cache still works
  }

  return storage;
}

/**
 * Get valid access token. Uses cached token if still valid, refreshes only when needed.
 * On 401 from Monzo API, call forceRefresh() then retry.
 */
export async function getValidAccessToken(): Promise<string> {
  // 1. Return in-memory cached token if not expired
  if (tokenCache) {
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    if (tokenCache.expiresAt > fiveMinutesFromNow) {
      return tokenCache.accessToken;
    }
    // Token expiring soon — refresh it
    try {
      tokenCache = await refreshAccessToken(tokenCache.refreshToken);
      return tokenCache.accessToken;
    } catch {
      tokenCache = null; // Clear stale cache
    }
  }

  // 2. Try cookies (first load or after cache cleared)
  const cookieTokens = await getTokensFromCookies();
  if (cookieTokens) {
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    if (cookieTokens.expiresAt > fiveMinutesFromNow) {
      tokenCache = cookieTokens;
      return tokenCache.accessToken;
    }
    // Cookie token expired — refresh
    try {
      tokenCache = await refreshAccessToken(cookieTokens.refreshToken);
      return tokenCache.accessToken;
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      throw new Error('MONZO_NOT_CONNECTED');
    }
  }

  // 3. Fall back to env vars
  const envRefreshToken = process.env.MONZO_REFRESH_TOKEN;
  const envAccessToken = process.env.MONZO_ACCESS_TOKEN;

  if (envRefreshToken) {
    try {
      tokenCache = await refreshAccessToken(envRefreshToken);
      return tokenCache.accessToken;
    } catch {
      // Fall through
    }
  }

  if (envAccessToken) {
    return envAccessToken;
  }

  throw new Error('MONZO_NOT_CONNECTED');
}

/**
 * Force-refresh the token (called after a 401 from Monzo API).
 * Returns fresh access token or throws.
 */
export async function forceRefreshToken(): Promise<string> {
  // Try cookie refresh token
  const cookieTokens = await getTokensFromCookies();
  if (cookieTokens) {
    try {
      tokenCache = await refreshAccessToken(cookieTokens.refreshToken);
      return tokenCache.accessToken;
    } catch {
      tokenCache = null;
      throw new Error('MONZO_NOT_CONNECTED');
    }
  }

  const envRefreshToken = process.env.MONZO_REFRESH_TOKEN;
  if (envRefreshToken) {
    try {
      tokenCache = await refreshAccessToken(envRefreshToken);
      return tokenCache.accessToken;
    } catch {
      tokenCache = null;
      throw new Error('MONZO_TOKEN_INVALID');
    }
  }

  throw new Error('MONZO_NOT_CONNECTED');
}

/**
 * Check if Monzo tokens are available (from cookies or env vars)
 */
export async function hasValidTokens(): Promise<boolean> {
  const cookieTokens = await getTokensFromCookies();
  if (cookieTokens) return true;

  const envAccessToken = process.env.MONZO_ACCESS_TOKEN;
  return !!envAccessToken;
}

/**
 * Get OAuth authorization URL for initial setup
 */
export function getAuthorizationUrl(state: string = 'random_state', redirectUri?: string): string {
  const params = new URLSearchParams({
    client_id: MONZO_CLIENT_ID,
    redirect_uri: redirectUri || MONZO_REDIRECT_URI,
    response_type: 'code',
    state: state,
  });

  return `https://auth.monzo.com/?${params.toString()}`;
}
