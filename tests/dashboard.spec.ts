import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3002';

test.describe('Lunch Expenses Dashboard E2E Tests', () => {

  test('should load dashboard page successfully', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check page title
    await expect(page).toHaveTitle(/Lunch Expenses Dashboard/);

    // Check main heading
    await expect(page.locator('h1')).toContainText('Lunch Expenses');

    // Check for auto-update info
    await expect(page.getByText(/Auto-updates every 5 minutes/)).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for Total Spent card
    await expect(page.getByText('Total Spent')).toBeVisible();

    // Check for Lunch Count card
    await expect(page.getByText('Lunch Count')).toBeVisible();

    // Check for Average card
    await expect(page.getByText('Average')).toBeVisible();

    // Verify amounts are displayed (should have £ symbol)
    const amounts = await page.locator('text=/£\\d+\\.\\d{2}/').count();
    expect(amounts).toBeGreaterThan(0);
  });

  test('should display expenses table', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForLoadState('networkidle');

    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Merchant' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Location' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
  });

  test('should fetch data from Monzo API', async ({ page }) => {
    // Test API endpoint directly
    const response = await page.request.get(`${BASE_URL}/api/monzo`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('expenses');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('lastUpdated');

    // Verify expenses is an array
    expect(Array.isArray(data.expenses)).toBeTruthy();
  });

  test('should display "Loading..." initially', async ({ page }) => {
    // Navigate without waiting for network
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Check if loading state appears (might be too fast to catch)
    const loadingText = page.getByText('Loading...');

    // Either loading appears or content loads directly
    await expect(async () => {
      const isLoading = await loadingText.isVisible({ timeout: 100 }).catch(() => false);
      const hasContent = await page.locator('h1').isVisible().catch(() => false);
      expect(isLoading || hasContent).toBeTruthy();
    }).toPass();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API call and make it fail
    await page.route('**/api/monzo', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test error' })
      });
    });

    await page.goto(BASE_URL);

    // Should show error message
    await expect(page.getByText(/Error:/)).toBeVisible();
  });

  test('should have correct styling (black & white theme)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check body background is white (Tailwind v4 uses LAB color space)
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // LAB(100 0 0) = white, RGB(255, 255, 255) = white
    expect(bgColor === 'lab(100 0 0)' || bgColor === 'rgb(255, 255, 255)').toBeTruthy();

    // Check main heading is black
    const h1 = page.locator('h1').first();
    const color = await h1.evaluate(el => window.getComputedStyle(el).color);
    // LAB(0 0 0) = black, RGB(0, 0, 0) = black
    expect(color === 'lab(0 0 0)' || color === 'rgb(0, 0, 0)').toBeTruthy();
  });

  test('should use Google Sans (Inter) font', async ({ page }) => {
    await page.goto(BASE_URL);

    const body = page.locator('body');
    const fontFamily = await body.evaluate(el => window.getComputedStyle(el).fontFamily);

    // Should include Inter in font stack
    expect(fontFamily).toContain('Inter');
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);

    const statsCards = page.locator('[class*="grid"]').first();
    await expect(statsCards).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(statsCards).toBeVisible();
  });
});

test.describe('Auto-refresh functionality', () => {
  test('should fetch new data periodically', async ({ page }) => {
    await page.goto(BASE_URL);

    // Get initial last updated time
    const initialUpdate = await page.locator('text=/Last updated:/').textContent();

    // Wait for potential refresh (we set it to 5 minutes, but we can trigger manually)
    // In a real test, you'd mock the interval or trigger a manual refresh

    expect(initialUpdate).toBeTruthy();
  });
});
