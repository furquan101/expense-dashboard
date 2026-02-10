import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Essential QA Tests', () => {

  test('Dashboard loads with correct data', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify main heading
    await expect(page.getByRole('heading', { name: 'Expense Reports' })).toBeVisible();

    // Verify stat cards show amounts
    await expect(page.getByText('£2057.60')).toBeVisible();
    await expect(page.getByText('£195.77')).toBeVisible();
    await expect(page.getByText('£1861.83')).toBeVisible();

    console.log('✓ Dashboard loaded with correct totals');
  });

  test('Sync Monzo button has correct styling', async ({ page }) => {
    await page.goto(BASE_URL);

    const syncButton = page.getByRole('button', { name: /Sync.*Monzo/i });
    await expect(syncButton).toBeVisible();

    // Verify button text is uppercase
    const text = await syncButton.textContent();
    expect(text).toBe(text?.toUpperCase());

    // Verify has border
    const hasBorder = await syncButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return parseInt(style.borderWidth) > 0;
    });
    expect(hasBorder).toBe(true);

    console.log('✓ Sync Monzo button: outline style with uppercase text');
  });

  test('Work Lunches section displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find Work Lunches accordion trigger
    const workLunchesButton = page.getByRole('button', { name: /Work Lunches.*12 items/ });
    await workLunchesButton.click();
    await page.waitForTimeout(500);

    // Verify table headers
    const tableHeaders = page.getByRole('columnheader');
    await expect(tableHeaders.filter({ hasText: 'Date' })).toBeVisible();
    await expect(tableHeaders.filter({ hasText: 'Merchant' })).toBeVisible();
    await expect(tableHeaders.filter({ hasText: 'Amount' })).toBeVisible();

    // Count rows
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
    await page.waitForTimeout(500);

    // Mobile cards should be visible (contains amounts)
    const cards = page.locator('div').filter({ hasText: /£\d+\.\d{2}/ });
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(5);

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
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const qatarButton = page.getByRole('button', { name: /Qatar Business Trip/ });

    // Click to expand
    await qatarButton.click();
    await page.waitForTimeout(500);

    // Verify content appeared
    const categoryHeader = page.getByRole('columnheader', { name: 'Category' });
    await expect(categoryHeader).toBeVisible();

    // Click to collapse
    await qatarButton.click();
    await page.waitForTimeout(500);

    console.log('✓ Accordion interactions work correctly');
  });

  test('Amounts formatted with currency', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check all major amounts have £ symbol
    await expect(page.getByText('£2057.60')).toBeVisible();
    await expect(page.getByText('£195.77')).toBeVisible();
    await expect(page.getByText('£1861.83')).toBeVisible();

    console.log('✓ Currency formatting correct');
  });
});
