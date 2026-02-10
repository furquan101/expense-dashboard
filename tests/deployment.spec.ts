import { test, expect } from '@playwright/test';

test.setTimeout(120000); // 2 minutes

test('verify dashboard shows expenses', async ({ page }) => {
  const url = 'https://expense-dashboard-tawny.vercel.app';

  // Retry logic with timeout
  const maxRetries = 10;
  const retryDelay = 15000; // 15 seconds between retries
  let success = false;
  let lastError = '';

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`\n🔄 Attempt ${i + 1}/${maxRetries}...`);

      // Navigate to the page
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for the page to be interactive
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Give React time to render

      // Check for "No expenses found" text - if present, we need to retry
      const noExpensesText = await page.locator('text=/no expenses found/i').count();
      if (noExpensesText > 0) {
        lastError = 'Still showing "No expenses found"';
        console.log(`   ❌ ${lastError}`);

        if (i < maxRetries - 1) {
          console.log(`   ⏳ Waiting ${retryDelay/1000}s before retry...`);
          await page.waitForTimeout(retryDelay);
          continue;
        }
      }

      // Look for expense data - check for amounts and total count
      const amountCount = await page.locator('text=/£\\d+\\.\\d{2}/').count();
      const totalExpensesText = await page.locator('text=/Total Expenses/i').count();

      // Check for the actual total number in the header
      const totalText = await page.locator('text=/£2,057.60/i, text=/£2057.60/i').count();

      console.log(`   📊 Found: ${amountCount} amounts, totalHeader: ${totalExpensesText}, totalValue: ${totalText}`);

      if (amountCount >= 10) { // Should have many amounts if data loaded
        console.log(`   ✅ Expenses are displaying!`);

        // Take a screenshot for verification
        await page.screenshot({ path: '/tmp/dashboard-success.png', fullPage: true });
        console.log(`   📸 Screenshot saved to /tmp/dashboard-success.png`);

        // Verify we have sufficient expense data
        expect(amountCount).toBeGreaterThan(10);
        expect(totalExpensesText).toBeGreaterThan(0);

        success = true;
        break;
      } else {
        lastError = 'No expense data found on page';
        console.log(`   ❌ ${lastError}`);

        // Take a screenshot for debugging
        await page.screenshot({ path: `/tmp/dashboard-fail-${i}.png`, fullPage: true });
        console.log(`   📸 Debug screenshot saved to /tmp/dashboard-fail-${i}.png`);

        if (i < maxRetries - 1) {
          console.log(`   ⏳ Waiting ${retryDelay/1000}s before retry...`);
          await page.waitForTimeout(retryDelay);
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Error: ${lastError}`);

      if (i < maxRetries - 1) {
        console.log(`   ⏳ Waiting ${retryDelay/1000}s before retry...`);
        await page.waitForTimeout(retryDelay);
      }
    }
  }

  if (!success) {
    throw new Error(`Dashboard verification failed after ${maxRetries} attempts. Last error: ${lastError}`);
  }

  console.log('\n✅ Dashboard is working correctly!\n');
});
