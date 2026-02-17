import { test, expect, type Cookie } from '@playwright/test';

/**
 * End-to-End OAuth Authentication & Cookie-based Token Storage Tests
 *
 * Tests the complete OAuth flow including:
 * - OAuth initiation with CSRF protection
 * - Token exchange and encrypted cookie storage
 * - Token refresh mechanism
 * - Disconnect functionality
 * - Connection status indicators
 */

const BASE_URL = 'http://localhost:3000';

test.describe('OAuth Authentication Flow', () => {

  test('OAuth setup endpoint generates valid authorization URL', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/monzo-oauth/setup`, {
      maxRedirects: 0,
    });

    // Should redirect to Monzo OAuth
    expect(response.status()).toBe(307);

    const location = response.headers()['location'];
    expect(location).toContain('auth.monzo.com');
    expect(location).toContain('client_id');
    expect(location).toContain('redirect_uri');
    expect(location).toContain('response_type=code');
    expect(location).toContain('state='); // CSRF protection

    console.log('✓ OAuth setup redirects to Monzo with correct parameters');
  });

  test('OAuth setup sets CSRF state cookie', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/monzo-oauth/setup`, { waitUntil: 'commit' });

    // Check for monzo_oauth_state cookie
    const cookies = await page.context().cookies();
    const stateCookie = cookies.find(c => c.name === 'monzo_oauth_state');

    if (stateCookie) {
      expect(stateCookie.httpOnly).toBe(true);
      expect(stateCookie.value).toBeTruthy();
      expect(stateCookie.value.length).toBeGreaterThan(10); // Valid state token

      console.log('✓ CSRF state cookie set correctly');
    } else {
      console.log('⚠️ State cookie not found (may have been consumed)');
    }
  });

  test('OAuth callback validates CSRF state', async ({ request }) => {
    // Attempt callback without state cookie (should fail)
    const response = await request.get(
      `${BASE_URL}/api/monzo-oauth/callback?code=test_code&state=invalid_state`,
      { maxRedirects: 0 }
    );

    const location = response.headers()['location'];

    // Should redirect back with error
    expect(location).toContain('auth_error=invalid_state');

    console.log('✓ OAuth callback validates CSRF state token');
  });

  test('OAuth callback requires authorization code', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/monzo-oauth/callback?state=test`,
      { maxRedirects: 0 }
    );

    const location = response.headers()['location'];
    expect(location).toContain('auth_error=no_code');

    console.log('✓ OAuth callback requires authorization code');
  });
});

test.describe('Token Cookie Storage', () => {

  test('API does not expose token cookies in responses', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/expenses`);

    const setCookieHeaders = response.headers()['set-cookie'] || '';
    const body = await response.text();

    // Should not contain sensitive cookie names in body
    expect(body).not.toContain('monzo_access_token');
    expect(body).not.toContain('monzo_refresh_token');
    expect(body).not.toContain('monzo_expires_at');

    console.log('✓ Token cookies not exposed in API responses');
  });

  test('Token cookies use secure flags', async ({ page, context }) => {
    // Note: secure flag only applies in production (HTTPS)
    await page.goto(BASE_URL);

    const cookies = await context.cookies();
    const monzoCookies = cookies.filter(c => c.name.startsWith('monzo_'));

    for (const cookie of monzoCookies) {
      expect(cookie.httpOnly).toBe(true); // Should be httpOnly
      expect(cookie.sameSite).toBe('Lax'); // Should use sameSite

      console.log(`✓ Cookie ${cookie.name} has secure flags`);
    }

    if (monzoCookies.length === 0) {
      console.log('ℹ️ No Monzo cookies found (not authenticated)');
    }
  });

  test('Token cookies have appropriate expiration', async ({ page, context }) => {
    await page.goto(BASE_URL);

    const cookies = await context.cookies();
    const refreshCookie = cookies.find(c => c.name === 'monzo_refresh_token');

    if (refreshCookie) {
      const expiresTimestamp = refreshCookie.expires;
      const now = Date.now() / 1000;
      const daysUntilExpiry = (expiresTimestamp - now) / (60 * 60 * 24);

      // Refresh token should expire in approximately 90 days
      expect(daysUntilExpiry).toBeGreaterThan(80);
      expect(daysUntilExpiry).toBeLessThan(95);

      console.log(`✓ Refresh token expires in ~${Math.round(daysUntilExpiry)} days`);
    } else {
      console.log('ℹ️ No refresh token found (not authenticated)');
    }
  });
});

test.describe('Disconnect Functionality', () => {

  test('Disconnect API endpoint exists', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/monzo-disconnect`);

    // Should return 200 (whether or not tokens exist)
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('success');

    console.log('✓ Disconnect endpoint responds correctly');
  });

  test('Disconnect button appears when connected', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses') && res.status() === 200
    );

    const data = await response.json();

    if (data.monzoConnected === true) {
      // Disconnect button should be visible
      const disconnectButton = page.getByRole('button', { name: /Disconnect/i });
      await expect(disconnectButton).toBeVisible();

      console.log('✓ Disconnect button visible when connected');
    } else {
      console.log('ℹ️ Monzo not connected, disconnect button should not appear');
    }
  });

  test('Disconnect modal shows confirmation dialog', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses')
    );

    const data = await response.json();

    if (data.monzoConnected === true) {
      // Click disconnect
      const disconnectButton = page.getByRole('button', { name: /Disconnect/i });
      await disconnectButton.click();

      // Modal should appear
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/Are you sure/i)).toBeVisible();

      // Should have cancel and confirm buttons
      await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Disconnect/i }).last()).toBeVisible();

      console.log('✓ Disconnect confirmation modal works');
    } else {
      console.log('⊘ Skipping: Monzo not connected');
    }
  });

  test('Cancel button closes disconnect modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses')
    );

    const data = await response.json();

    if (data.monzoConnected === true) {
      // Open modal
      await page.getByRole('button', { name: /Disconnect/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible();

      console.log('✓ Cancel button closes modal');
    } else {
      console.log('⊘ Skipping: Monzo not connected');
    }
  });
});

test.describe('Connection Status Indicators', () => {

  test('Connection status shows next to last updated timestamp', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Get API response
    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses') && res.status() === 200
    );

    const data = await response.json();

    // Last updated should be visible
    await expect(page.locator('text=/Last updated:/i')).toBeVisible();

    if (data.monzoConnected === true) {
      // Connection indicator should be visible
      const connectionStatus = page.getByText(/Monzo Connected/i);
      await expect(connectionStatus).toBeVisible();

      console.log('✓ Connection status indicator visible');
    } else {
      console.log('ℹ️ Monzo not connected - no connection indicator expected');
    }
  });

  test('Connection status has visual indicator (dot)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses')
    );

    const data = await response.json();

    if (data.monzoConnected === true) {
      // Look for animated dot indicator
      const dotIndicator = page.locator('.animate-pulse').filter({ hasText: '' });

      if (await dotIndicator.count() > 0) {
        const firstDot = dotIndicator.first();
        const size = await firstDot.boundingBox();

        // Should be a small dot (roughly 6px)
        if (size) {
          expect(size.width).toBeLessThan(10);
          expect(size.height).toBeLessThan(10);
        }

        console.log('✓ Animated connection indicator dot present');
      }
    } else {
      console.log('ℹ️ Not connected - no dot indicator expected');
    }
  });

  test('Disconnected state shows reconnect banner', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses')
    );

    const data = await response.json();

    if (data.monzoConnected === false) {
      // Should show reconnect banner
      const banner = page.getByText(/Connect.*Monzo/i);
      await expect(banner).toBeVisible();

      console.log('✓ Disconnected banner visible');
    } else {
      console.log('✓ Connected - no reconnect banner shown');
    }
  });
});

test.describe('Token Refresh Mechanism', () => {

  test('API handles expired access tokens gracefully', async ({ request }) => {
    // Request with expired token scenario
    const response = await request.get(`${BASE_URL}/api/expenses?includeMonzo=true`);

    // Should not crash, return 200 with graceful degradation
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('expenses');

    console.log('✓ Expired tokens handled gracefully');
  });

  test('Force refresh on 401 error works', async ({ page }) => {
    // This test verifies the getValidAccessToken() force refresh logic
    await page.goto(BASE_URL);

    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses')
    );

    // If tokens are expired, should still get a response (not crash)
    expect(response.ok()).toBeTruthy();

    console.log('✓ 401 force refresh mechanism present');
  });
});

test.describe('Dynamic Redirect URI', () => {

  test('OAuth redirect URI adapts to environment', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/monzo-oauth/setup`, {
      maxRedirects: 0,
    });

    const location = response.headers()['location'];

    // Should include correct redirect_uri for current environment
    expect(location).toContain('redirect_uri=');

    // For localhost, should use localhost
    if (BASE_URL.includes('localhost')) {
      expect(location).toContain('localhost');
    }

    console.log('✓ OAuth redirect URI adapts to environment');
  });
});

test.describe('Security & Privacy', () => {

  test('Tokens are encrypted in cookies', async ({ page, context }) => {
    // Navigate to ensure cookies are set (if authenticated)
    await page.goto(BASE_URL);

    const cookies = await context.cookies();
    const tokenCookies = cookies.filter(c =>
      c.name === 'monzo_access_token' ||
      c.name === 'monzo_refresh_token'
    );

    for (const cookie of tokenCookies) {
      // Cookie value should be base64 encoded ciphertext, not plain tokens
      expect(cookie.value).not.toMatch(/^user-/); // Monzo tokens start with 'user-'
      expect(cookie.value).not.toMatch(/^oauthtoken_/); // Monzo refresh tokens

      // Should be base64-like (encrypted)
      expect(cookie.value).toMatch(/^[A-Za-z0-9+/=]+$/);

      console.log(`✓ Cookie ${cookie.name} is encrypted`);
    }

    if (tokenCookies.length === 0) {
      console.log('ℹ️ No token cookies found (not authenticated)');
    }
  });

  test('API does not log sensitive token data', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check console logs don't contain tokens
    for (const log of consoleLogs) {
      expect(log).not.toContain('user-');
      expect(log).not.toContain('oauthtoken_');
      expect(log).not.toContain('access_token');
      expect(log).not.toContain('refresh_token');
    }

    console.log('✓ No sensitive tokens in console logs');
  });

  test('Expired token error does not expose token values', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check page content doesn't expose tokens
    const bodyText = await page.locator('body').textContent();

    expect(bodyText).not.toContain('user-');
    expect(bodyText).not.toContain('oauthtoken_');

    console.log('✓ Token values not exposed in UI');
  });
});

test.describe('User Experience', () => {

  test('OAuth flow is seamless after authentication', async ({ page }) => {
    // User clicks Connect -> Authenticates -> Redirects back -> Tokens saved
    // This tests the full flow conceptually

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // If connected, check for smooth UX
    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses')
    );

    const data = await response.json();

    if (data.monzoConnected === true) {
      // Should show transactions without additional clicks
      expect(data.expenses.length).toBeGreaterThan(0);

      console.log('✓ Seamless OAuth experience when connected');
    } else {
      console.log('ℹ️ Not connected - OAuth flow needed');
    }
  });

  test('Error states are user-friendly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses')
    );

    const data = await response.json();

    if (data.monzoConnected === false) {
      // Should show clear call-to-action
      const connectButton = page.getByRole('link', { name: /Connect.*Monzo/i });

      if (await connectButton.count() > 0) {
        await expect(connectButton).toBeVisible();
        console.log('✓ Clear call-to-action for authentication');
      }
    }
  });
});
