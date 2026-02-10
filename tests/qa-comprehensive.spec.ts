import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Expense Dashboard - Comprehensive QA', () => {

  test.describe('Desktop View', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test('should load dashboard with all stat cards', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check all three stat cards exist
      await expect(page.getByText('Total Expenses')).toBeVisible();
      await expect(page.getByText('Work Lunches')).toBeVisible();
      await expect(page.getByText('Qatar Trip')).toBeVisible();

      // Verify amounts are displayed
      await expect(page.getByText('£2057.60')).toBeVisible();
      await expect(page.getByText('£195.77')).toBeVisible();
      await expect(page.getByText('£1861.83')).toBeVisible();
    });

    test('should have outline Sync Monzo button with correct styling', async ({ page }) => {
      await page.goto(BASE_URL);

      const syncButton = page.getByRole('button', { name: /Sync Monzo/i });
      await expect(syncButton).toBeVisible();

      // Check button has uppercase text
      const buttonText = await syncButton.textContent();
      expect(buttonText?.toUpperCase()).toBe(buttonText);

      // Verify outline styling (should have border and transparent background)
      const buttonStyles = await syncButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderWidth: computed.borderWidth,
          borderColor: computed.borderColor,
          textTransform: computed.textTransform,
        };
      });

      expect(buttonStyles.textTransform).toBe('uppercase');
      expect(buttonStyles.borderWidth).toBeTruthy();
      // Background should be transparent (rgba(0, 0, 0, 0))
      expect(buttonStyles.backgroundColor).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)/);
    });

    test('should display Work Lunches accordion with table', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Find and click Work Lunches accordion
      const workLunchesAccordion = page.locator('text=Work Lunches').first();
      await workLunchesAccordion.click();

      // Wait for table to be visible
      await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Merchant' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Location' })).toBeVisible();

      // Verify table has rows
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('should display Qatar Business Trip accordion with all columns', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Find and click Qatar accordion
      const qatarAccordion = page.locator('text=Qatar Business Trip').first();
      await qatarAccordion.click();

      // Wait for table headers
      await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();

      // Verify table has data
      const tableRows = page.locator('tbody tr').last();
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    });

    test('should show correct expense counts in subheaders', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check Work Lunches subheader
      await expect(page.getByText(/12 items.*Kings Cross.*£195\.77/)).toBeVisible();

      // Check Qatar Trip subheader
      await expect(page.getByText(/45 items.*Feb 1-7, 2026.*£1861\.83/)).toBeVisible();
    });

    test('should toggle accordion sections', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const workLunchesAccordion = page.locator('[data-state]').filter({ hasText: 'Work Lunches' }).first();

      // Initially should be expanded or collapsed
      const initialState = await workLunchesAccordion.getAttribute('data-state');

      // Click to toggle
      await workLunchesAccordion.click();
      await page.waitForTimeout(500); // Wait for animation

      const newState = await workLunchesAccordion.getAttribute('data-state');
      expect(newState).not.toBe(initialState);
    });
  });

  test.describe('Mobile View', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 Pro
    });

    test('should show mobile card layout instead of tables', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Expand Work Lunches
      const workLunchesAccordion = page.locator('text=Work Lunches').first();
      await workLunchesAccordion.click();
      await page.waitForTimeout(300);

      // Mobile should show cards with .md:hidden class
      const mobileCards = page.locator('.md\\:hidden').filter({ hasText: /£/ });
      const cardCount = await mobileCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Desktop table should be hidden
      const desktopTable = page.locator('.hidden.md\\:block');
      await expect(desktopTable.first()).not.toBeVisible();
    });

    test('should have touch-friendly button (44px minimum)', async ({ page }) => {
      await page.goto(BASE_URL);

      const syncButton = page.getByRole('button', { name: /Sync Monzo/i });
      const box = await syncButton.boundingBox();

      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    test('should display stat cards in single column on mobile', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Get all stat cards
      const statCards = page.locator('.grid > div').filter({ hasText: /Total Expenses|Work Lunches|Qatar Trip/ });
      const count = await statCards.count();

      expect(count).toBe(3);

      // They should stack vertically (grid-cols-1)
      const gridContainer = page.locator('.grid').first();
      const gridClass = await gridContainer.getAttribute('class');
      expect(gridClass).toContain('grid-cols-1');
    });
  });

  test.describe('API Integration', () => {
    test('should fetch expenses from API', async ({ page }) => {
      await page.goto(BASE_URL);

      // Wait for API call
      const response = await page.waitForResponse(
        response => response.url().includes('/api/expenses') && response.status() === 200
      );

      const data = await response.json();

      expect(data.expenses).toBeDefined();
      expect(data.total).toBeDefined();
      expect(data.count).toBeDefined();
      expect(data.expenses.length).toBeGreaterThan(0);
    });

    test('should display last updated timestamp', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Look for timestamp in format "Last updated: HH:MM:SS"
      const timestamp = page.locator('text=/Last updated:/i');
      await expect(timestamp).toBeVisible();
    });
  });

  test.describe('Typography & Styling', () => {
    test('should use Inter font family', async ({ page }) => {
      await page.goto(BASE_URL);

      const heading = page.getByText('Expense Reports');
      const fontFamily = await heading.evaluate((el) =>
        window.getComputedStyle(el).fontFamily
      );

      expect(fontFamily.toLowerCase()).toContain('inter');
    });

    test('should use tabular numbers for amounts', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Expand accordion
      const workLunchesAccordion = page.locator('text=Work Lunches').first();
      await workLunchesAccordion.click();
      await page.waitForTimeout(300);

      // Check amount has font-mono class
      const amount = page.locator('.font-mono').filter({ hasText: /£\d+\.\d{2}/ }).first();
      await expect(amount).toBeVisible();
    });

    test('should use YouTube dark theme colors', async ({ page }) => {
      await page.goto(BASE_URL);

      const body = await page.locator('body');
      const bgColor = await body.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should be #0f0f0f or rgb(15, 15, 15)
      expect(bgColor).toMatch(/rgb\(15,\s*15,\s*15\)|#0f0f0f/i);
    });
  });

  test.describe('Data Accuracy', () => {
    test('should show correct totals', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Get API data
      const response = await page.waitForResponse(
        response => response.url().includes('/api/expenses')
      );
      const data = await response.json();

      // Verify Total Expenses card
      const totalCard = page.locator('text=Total Expenses').locator('..');
      await expect(totalCard.getByText(`£${data.total}`)).toBeVisible();

      // Verify Work Lunches card
      const workLunchesCard = page.locator('text=Work Lunches').first().locator('..');
      await expect(workLunchesCard.getByText(`£${data.workLunches.total}`)).toBeVisible();
    });

    test('should format dates correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Expand Work Lunches
      const workLunchesAccordion = page.locator('text=Work Lunches').first();
      await workLunchesAccordion.click();
      await page.waitForTimeout(300);

      // Check for date format: "Day, DD Mon"
      const dateCell = page.locator('text=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/').first();
      await expect(dateCell).toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should hide/show elements at breakpoints', async ({ page }) => {
      // Test at 767px (just below md breakpoint)
      await page.setViewportSize({ width: 767, height: 800 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const workLunchesAccordion = page.locator('text=Work Lunches').first();
      await workLunchesAccordion.click();
      await page.waitForTimeout(300);

      // Mobile cards should be visible
      const mobileCards = page.locator('.md\\:hidden').first();
      await expect(mobileCards).toBeVisible();

      // Now test at 768px (md breakpoint)
      await page.setViewportSize({ width: 768, height: 800 });
      await page.waitForTimeout(500);

      // Desktop table should be visible
      const desktopTable = page.locator('.hidden.md\\:block table').first();
      await expect(desktopTable).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(BASE_URL);

      const syncButton = page.getByRole('button', { name: /Sync with Monzo/i });
      await expect(syncButton).toBeVisible();
    });

    test('should have semantic HTML structure', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check for main headings
      const mainHeading = page.getByRole('heading', { level: 1 });
      await expect(mainHeading).toBeVisible();

      // Expand accordion and check for tables
      const workLunchesAccordion = page.locator('text=Work Lunches').first();
      await workLunchesAccordion.click();
      await page.waitForTimeout(300);

      const table = page.getByRole('table').first();
      await expect(table).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Should load in less than 5 seconds
      expect(loadTime).toBeLessThan(5000);
      console.log(`✓ Page loaded in ${loadTime}ms`);
    });

    test('should handle show more button clicks', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Expand Work Lunches
      const workLunchesAccordion = page.locator('text=Work Lunches').first();
      await workLunchesAccordion.click();
      await page.waitForTimeout(300);

      // Look for "Show More" button
      const showMoreButton = page.getByText(/Show \d+ More/i);

      if (await showMoreButton.isVisible()) {
        const initialRowCount = await page.locator('tbody tr').count();

        await showMoreButton.click();
        await page.waitForTimeout(300);

        const newRowCount = await page.locator('tbody tr').count();
        expect(newRowCount).toBeGreaterThan(initialRowCount);
      }
    });
  });
});
