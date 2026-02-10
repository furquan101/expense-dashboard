import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ============================================
// DESKTOP TESTS
// ============================================

test.describe('Desktop Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('should load dashboard successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check title
    await expect(page.locator('h1')).toContainText('Expense Reports');

    // Check subtitle
    await expect(page.getByText(/Real-time lunch tracking/)).toBeVisible();
  });

  test('should display all stat cards', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForSelector('[class*="tabular-nums"]', { timeout: 10000 });

    // Check for three stat cards
    const cards = page.locator('.grid > div').filter({ hasText: /£/ });
    await expect(cards).toHaveCount(3);

    // Check stat card labels
    await expect(page.getByText('Total Expenses')).toBeVisible();
    await expect(page.getByText('Work Lunches')).toBeVisible();
    await expect(page.getByText('Qatar Trip')).toBeVisible();
  });

  test('should show tables on desktop', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Tables should be visible on desktop (md breakpoint and above)
    const tables = page.locator('table');
    const tableCount = await tables.count();

    // Should have at least one table visible
    expect(tableCount).toBeGreaterThan(0);
  });

  test('should not show mobile cards on desktop', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Mobile card view should be hidden on desktop
    const mobileCards = page.locator('.md\\:hidden').filter({ hasText: /£/ });
    const isVisible = await mobileCards.first().isVisible().catch(() => false);

    expect(isVisible).toBe(false);
  });

  test('sync button should be touch-friendly (44px minimum)', async ({ page }) => {
    await page.goto(BASE_URL);

    const syncButton = page.getByRole('button', { name: /Sync Monzo/i });
    const box = await syncButton.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle sync button click', async ({ page }) => {
    await page.goto(BASE_URL);

    const syncButton = page.getByRole('button', { name: /Sync Monzo/i });
    await expect(syncButton).toBeEnabled();

    await syncButton.click();

    // Should show syncing state
    await expect(syncButton).toContainText('Syncing');
    await expect(syncButton).toBeDisabled();

    // Should eventually return to normal state
    await expect(syncButton).toContainText('Sync Monzo', { timeout: 10000 });
  });

  test('accordions should expand and collapse', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find accordion triggers
    const workLunchesAccordion = page.getByRole('button', { name: /Work Lunches/i });

    // Should be expanded by default (defaultValue prop)
    await expect(workLunchesAccordion).toHaveAttribute('data-state', 'open');

    // Click to collapse
    await workLunchesAccordion.click();
    await expect(workLunchesAccordion).toHaveAttribute('data-state', 'closed');

    // Click to expand again
    await workLunchesAccordion.click();
    await expect(workLunchesAccordion).toHaveAttribute('data-state', 'open');
  });

  test('show more button should work', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for "Show More" button
    const showMoreButton = page.getByRole('button', { name: /Show \d+ More/i });

    if (await showMoreButton.count() > 0) {
      const firstButton = showMoreButton.first();
      await firstButton.click();

      // Should change to "Show Less"
      await expect(firstButton).toContainText('Show Less');

      // Click again
      await firstButton.click();
      await expect(firstButton).toContainText(/Show \d+ More/i);
    }
  });

  test('show more buttons should be touch-friendly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const showMoreButton = page.getByRole('button', { name: /Show \d+ More/i });

    if (await showMoreButton.count() > 0) {
      const box = await showMoreButton.first().boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should display last updated timestamp', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Last updated:/i)).toBeVisible();
  });

  test('should have correct theme colors', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check background color
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);

    // Should be dark (#0f0f0f or close to it)
    expect(bgColor).toMatch(/rgb\(15,\s*15,\s*15\)/);
  });

  test('should have accessible focus states', async ({ page }) => {
    await page.goto(BASE_URL);

    // Tab to sync button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const syncButton = page.getByRole('button', { name: /Sync Monzo/i });
    await expect(syncButton).toBeFocused();

    // Check for visible focus outline
    const outline = await syncButton.evaluate(el => window.getComputedStyle(el).outline);
    expect(outline).not.toBe('none');
  });
});

// ============================================
// MOBILE TESTS
// ============================================

test.describe('Mobile Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 size
  });

  test('should load dashboard on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Expense Reports');
  });

  test('should show mobile card view instead of tables', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForSelector('[class*="border-\\[\\#3f3f3f\\]"]', { timeout: 10000 });

    // Mobile cards should be visible
    const mobileCards = page.locator('.md\\:hidden').filter({ hasText: /£/ });
    const cardCount = await mobileCards.count();

    expect(cardCount).toBeGreaterThan(0);
  });

  test('should not show tables on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Tables should be hidden on mobile (hidden md:block)
    const tables = page.locator('.hidden.md\\:block table');
    const isVisible = await tables.first().isVisible().catch(() => false);

    expect(isVisible).toBe(false);
  });

  test('mobile cards should display key info', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for cards to load
    await page.waitForSelector('.md\\:hidden', { timeout: 10000 });

    const firstCard = page.locator('.md\\:hidden > div').first();

    if (await firstCard.count() > 0) {
      // Should show merchant name
      await expect(firstCard.locator('.font-medium')).toBeVisible();

      // Should show amount
      await expect(firstCard.locator('.font-mono')).toContainText('£');

      // Should show date
      await expect(firstCard.locator('.text-\\[\\#aaaaaa\\]').first()).toBeVisible();
    }
  });

  test('stat cards should stack vertically on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const statsGrid = page.locator('.grid').first();
    const gridTemplateColumns = await statsGrid.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    // On mobile, should be single column
    // grid-cols-1 means "repeat(1, minmax(0, 1fr))"
    expect(gridTemplateColumns).toContain('1fr');
  });

  test('header should stack on mobile', async ({ page }) => {
    await page.goto(BASE_URL);

    const header = page.locator('.border-b').first();
    const flexDirection = await header.locator('div').first().evaluate(el =>
      window.getComputedStyle(el).flexDirection
    );

    // Should be column on mobile
    expect(flexDirection).toBe('column');
  });

  test('sync button should be full width on mobile', async ({ page }) => {
    await page.goto(BASE_URL);

    const syncButton = page.getByRole('button', { name: /Sync Monzo/i });
    const parentWidth = await syncButton.evaluate(el =>
      el.parentElement!.getBoundingClientRect().width
    );
    const buttonWidth = await syncButton.evaluate(el =>
      el.getBoundingClientRect().width
    );

    // Should be close to full width (allowing for padding)
    expect(buttonWidth).toBeGreaterThan(parentWidth * 0.9);
  });

  test('touch targets should be 44px minimum on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Sync button
    const syncButton = page.getByRole('button', { name: /Sync Monzo/i });
    const syncBox = await syncButton.boundingBox();
    expect(syncBox!.height).toBeGreaterThanOrEqual(44);

    // Accordion triggers
    const accordionTriggers = page.getByRole('button', { name: /Work Lunches|Qatar|Recent/i });
    const accordionBox = await accordionTriggers.first().boundingBox();
    expect(accordionBox!.height).toBeGreaterThanOrEqual(44);

    // Show more buttons
    const showMoreButtons = page.getByRole('button', { name: /Show.*More|Show Less/i });
    if (await showMoreButtons.count() > 0) {
      const showMoreBox = await showMoreButtons.first().boundingBox();
      expect(showMoreBox!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should reduce padding on mobile', async ({ page }) => {
    await page.goto(BASE_URL);

    const container = page.locator('.min-h-screen').first();
    const padding = await container.evaluate(el =>
      window.getComputedStyle(el).padding
    );

    // Should use p-4 on mobile (16px)
    expect(padding).toMatch(/16px/);
  });

  test('font sizes should be readable on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Main heading
    const h1 = page.locator('h1');
    const h1Size = await h1.evaluate(el =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );

    // Should be at least 24px for readability
    expect(h1Size).toBeGreaterThanOrEqual(24);
  });
});

// ============================================
// TABLET TESTS
// ============================================

test.describe('Tablet Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 }); // iPad Pro size
  });

  test('should load dashboard on tablet', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Expense Reports');
  });

  test('stat cards should show 2 columns on tablet', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const statsGrid = page.locator('.grid').first();
    const gridTemplateColumns = await statsGrid.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    // sm:grid-cols-2 means 2 columns on tablet
    const columns = gridTemplateColumns.split(' ').length;
    expect(columns).toBeGreaterThanOrEqual(2);
  });
});

// ============================================
// LOADING STATE TESTS
// ============================================

test.describe('Loading States', () => {
  test('should show loading skeleton initially', async ({ page }) => {
    // Navigate but don't wait for network
    const response = page.goto(BASE_URL);

    // Check for loading skeleton
    const skeleton = page.locator('.animate-pulse');
    await expect(skeleton.first()).toBeVisible({ timeout: 2000 });

    await response;
  });

  test('loading skeleton should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    const response = page.goto(BASE_URL);

    // Skeleton should adapt to mobile
    const skeleton = page.locator('.animate-pulse');
    await expect(skeleton.first()).toBeVisible({ timeout: 2000 });

    await response;
  });
});

// ============================================
// ERROR STATE TESTS
// ============================================

test.describe('Error States', () => {
  test('should handle API errors gracefully', async ({ page, context }) => {
    // Block API requests to simulate error
    await context.route('**/api/expenses*', route =>
      route.abort()
    );

    await page.goto(BASE_URL);

    // Should show error message
    await expect(page.getByText(/Failed to load expenses/i)).toBeVisible({ timeout: 10000 });

    // Should show retry button
    await expect(page.getByRole('button', { name: /Try Again/i })).toBeVisible();
  });

  test('retry button should work', async ({ page, context }) => {
    let requestCount = 0;

    await context.route('**/api/expenses*', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(BASE_URL);

    // Wait for error
    await expect(page.getByText(/Failed to load expenses/i)).toBeVisible({ timeout: 10000 });

    // Click retry
    await page.getByRole('button', { name: /Try Again/i }).click();

    // Should load successfully
    await expect(page.locator('h1')).toContainText('Expense Reports');
  });
});

// ============================================
// EMPTY STATE TESTS
// ============================================

test.describe('Empty States', () => {
  test('should show empty state when no expenses', async ({ page, context }) => {
    // Mock API to return empty expenses
    await context.route('**/api/expenses*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          expenses: [],
          total: 0,
          count: 0,
          workLunches: { total: 0, count: 0 },
          qatarTrip: { total: 0, count: 0 },
          lastUpdated: new Date().toISOString()
        })
      })
    );

    await page.goto(BASE_URL);

    // Should show empty state
    await expect(page.getByText(/No expenses found/i)).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// ACCESSIBILITY TESTS
// ============================================

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Sync button
    const syncButton = page.getByRole('button', { name: /Sync/i });
    const ariaLabel = await syncButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Progress bar
    const progressBar = page.locator('[role="progressbar"]');
    if (await progressBar.count() > 0) {
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      expect(ariaValueNow).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate focused element with Enter
    await page.keyboard.press('Enter');

    // Should not crash or hang
    await page.waitForTimeout(500);
  });

  test('should support reduced motion', async ({ page }) => {
    // Emulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Animations should be minimal
    const animatedElement = page.locator('[class*="animate"]').first();
    const animationDuration = await animatedElement.evaluate(el =>
      window.getComputedStyle(el).animationDuration
    );

    // Should be instant or very fast
    expect(parseFloat(animationDuration)).toBeLessThan(0.1);
  });
});

// ============================================
// VISUAL CONSISTENCY TESTS
// ============================================

test.describe('Visual Consistency', () => {
  test('should maintain layout consistency across breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 800, name: 'desktop' }
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize(breakpoint);
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // All breakpoints should show main elements
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('button', { name: /Sync/i })).toBeVisible();

      // Should not have horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasHorizontalScroll).toBe(false);
    }
  });

  test('cards should have consistent styling', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[class*="border-\\[\\#3f3f3f\\]"]');
    const firstCard = cards.first();

    // Should have rounded corners
    const borderRadius = await firstCard.evaluate(el =>
      window.getComputedStyle(el).borderRadius
    );
    expect(borderRadius).not.toBe('0px');

    // Should have border
    const borderWidth = await firstCard.evaluate(el =>
      window.getComputedStyle(el).borderWidth
    );
    expect(borderWidth).not.toBe('0px');
  });

  test('typography should use Inter font', async ({ page }) => {
    await page.goto(BASE_URL);

    const h1 = page.locator('h1');
    const fontFamily = await h1.evaluate(el =>
      window.getComputedStyle(el).fontFamily
    );

    expect(fontFamily.toLowerCase()).toContain('inter');
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

test.describe('Performance', () => {
  test('should load in reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle rapid interactions', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const syncButton = page.getByRole('button', { name: /Sync Monzo/i });

    // Rapid clicks should not break UI
    for (let i = 0; i < 5; i++) {
      await syncButton.click({ timeout: 100 }).catch(() => {});
      await page.waitForTimeout(100);
    }

    // UI should still be functional
    await expect(page.locator('h1')).toBeVisible();
  });
});
