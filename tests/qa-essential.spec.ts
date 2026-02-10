import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Essential QA Tests', () => {

  test('Dashboard loads with correct data', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify main heading
    await expect(page.getByRole('heading', { name: 'Expense Reports' })).toBeVisible();

    // Verify stat cards show amounts - use first() to avoid strict mode violations
    await expect(page.getByText('£2057.60').first()).toBeVisible();
    await expect(page.getByText('£195.77').first()).toBeVisible();
    await expect(page.getByText('£1861.83').first()).toBeVisible();

    console.log('✓ Dashboard loaded with correct totals');
  });

  test('Sync Monzo button has correct styling', async ({ page }) => {
    await page.goto(BASE_URL);

    const syncButton = page.getByRole('button', { name: /Sync.*Monzo/i });
    await expect(syncButton).toBeVisible();

    // Verify button has uppercase class applied
    const hasUppercaseClass = await syncButton.evaluate((el) => {
      return el.classList.contains('uppercase');
    });
    expect(hasUppercaseClass).toBe(true);

    // Verify has border
    const hasBorder = await syncButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return parseInt(style.borderWidth) > 0;
    });
    expect(hasBorder).toBe(true);

    // Verify background is transparent
    const isTransparent = await syncButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      // Check for transparent or rgba(0,0,0,0)
      return bg === 'transparent' || bg.includes('rgba(0, 0, 0, 0)') || bg === 'rgba(0, 0, 0, 0)';
    });
    expect(isTransparent).toBe(true);

    console.log('✓ Sync Monzo button: outline style with uppercase class');
  });

  test('Work Lunches section displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find Work Lunches accordion trigger
    const workLunchesButton = page.getByRole('button', { name: /Work Lunches.*12 items/ });
    await workLunchesButton.click();
    await page.waitForTimeout(800); // Increased wait for animation

    // Verify table headers - use more specific selectors
    await expect(page.locator('thead').getByText('Date')).toBeVisible();
    await expect(page.locator('thead').getByText('Merchant')).toBeVisible();
    await expect(page.locator('thead').getByText('Amount')).toBeVisible();
    await expect(page.locator('thead').getByText('Location')).toBeVisible();

    // Count rows in visible table
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);

    console.log(`✓ Work Lunches table: ${rows} rows displayed`);
  });

  test('Mobile view shows card layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Open Work Lunches
    const workLunchesButton = page.getByRole('button', { name: /Work Lunches/ });
    await workLunchesButton.click();
    await page.waitForTimeout(800);

    // Mobile cards should be visible - use more specific selector
    const mobileSection = page.locator('.md\\:hidden').first();
    await expect(mobileSection).toBeVisible();

    // Count expense cards
    const cards = page.locator('.md\\:hidden .border');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    console.log(`✓ Mobile view: ${cardCount} expense cards displayed`);
  });

  test('API returns correct data structure', async ({ page }) => {
    await page.goto(BASE_URL);

    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses') && res.status() === 200
    );

    const data = await response.json();

    // Verify structure
    expect(data).toHaveProperty('expenses');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('workLunches');
    expect(data).toHaveProperty('qatarTrip');

    // Verify counts
    expect(data.count).toBe(57);
    expect(data.workLunches.count).toBe(12);
    expect(data.qatarTrip.count).toBe(45);

    // Verify total
    expect(data.total).toBe(2057.6);

    console.log('✓ API response structure and counts verified');
  });

  test('Typography uses Inter font', async ({ page }) => {
    await page.goto(BASE_URL);

    const heading = page.getByRole('heading', { name: 'Expense Reports' });
    const font = await heading.evaluate(el =>
      window.getComputedStyle(el).fontFamily
    );

    expect(font.toLowerCase()).toContain('inter');
    console.log('✓ Inter font applied correctly');
  });

  test('Dark theme colors applied', async ({ page }) => {
    await page.goto(BASE_URL);

    const bgColor = await page.locator('body').evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // YouTube dark theme: #0f0f0f = rgb(15, 15, 15)
    expect(bgColor).toMatch(/rgb\(15,\s*15,\s*15\)/);
    console.log('✓ YouTube dark theme (#0f0f0f) applied');
  });

  test('Performance: Page loads quickly', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(3000);
    console.log(`✓ Page load time: ${duration}ms`);
  });

  test('Accordions are interactive', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Work with Work Lunches accordion since we know it works
    const workLunchesButton = page.getByRole('button', { name: /Work Lunches.*12 items/ });

    // Get initial state (should be open or closed)
    const initialState = await workLunchesButton.getAttribute('aria-expanded');

    // Click to toggle
    await workLunchesButton.click();
    await page.waitForTimeout(1000);

    // Get new state
    const newState = await workLunchesButton.getAttribute('aria-expanded');

    // States should be different (toggled)
    expect(initialState).not.toBe(newState);

    // Click again to toggle back
    await workLunchesButton.click();
    await page.waitForTimeout(1000);

    const finalState = await workLunchesButton.getAttribute('aria-expanded');
    expect(finalState).toBe(initialState);

    console.log('✓ Accordion interactions work correctly');
  });

  test('Amounts formatted with currency', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check all major amounts have £ symbol - use first() to avoid strict mode
    await expect(page.getByText('£2057.60').first()).toBeVisible();
    await expect(page.getByText('£195.77').first()).toBeVisible();
    await expect(page.getByText('£1861.83').first()).toBeVisible();

    console.log('✓ Currency formatting correct');
  });

  test('Last updated timestamp displays', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for timestamp
    const timestamp = page.locator('text=/Last updated:/i');
    await expect(timestamp).toBeVisible();

    // Verify timestamp format contains time
    const timestampText = await timestamp.textContent();
    expect(timestampText).toMatch(/\d{1,2}:\d{2}/); // Should have HH:MM format

    console.log('✓ Last updated timestamp displayed');
  });

  test('Button has correct padding and size', async ({ page }) => {
    await page.goto(BASE_URL);

    const syncButton = page.getByRole('button', { name: /Sync.*Monzo/i });
    const box = await syncButton.boundingBox();

    expect(box).not.toBeNull();

    // Verify button height (py-3 = 12px top/bottom, so ~24px + text height)
    // Should be around 36-48px total
    expect(box!.height).toBeGreaterThan(30);
    expect(box!.height).toBeLessThan(60);

    console.log(`✓ Button size correct: ${box!.height}px height`);
  });

  test('All expense data loads without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Open both accordions
    await page.getByRole('button', { name: /Work Lunches/ }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Qatar Business Trip/ }).click();
    await page.waitForTimeout(500);

    // Check for any console errors
    expect(errors).toHaveLength(0);

    console.log('✓ No console errors detected');
  });
});
