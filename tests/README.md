# Expense Dashboard Test Suite

Comprehensive Playwright tests for the expense dashboard application, with focus on the critical Monzo integration bug fix.

## Test Structure

```
tests/
├── README.md                      # This file
├── critical-bug-fix.spec.ts      # Tests for the 7-day fetch bug fix
├── monzo-integration.spec.ts     # Comprehensive Monzo integration tests
├── qa-essential.spec.ts          # Essential QA tests (existing)
├── qa-comprehensive.spec.ts      # Comprehensive QA tests (existing)
└── fixtures/
    └── test-helpers.ts           # Reusable test utilities
```

## Critical Bug Fix

**Bug**: Latest Monzo transactions weren't displaying on the dashboard
**Root Cause**: 60-day fetch range caused pagination issues
**Fix**: Changed from 60 days to 7 days in `/app/api/expenses/route.ts` line 144
**Test Coverage**: `critical-bug-fix.spec.ts`

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test tests/critical-bug-fix.spec.ts
npx playwright test tests/monzo-integration.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

### Run tests in UI mode (interactive)
```bash
npx playwright test --ui
```

### Run only critical tests
```bash
npx playwright test tests/critical-bug-fix.spec.ts
```

### Generate HTML report
```bash
npx playwright test
npx playwright show-report
```

## Test Suites

### 1. Critical Bug Fix Tests (`critical-bug-fix.spec.ts`)

**Purpose**: Verify the 7-day fetch range fix and prevent regression

**Key Tests**:
- ✅ API fetches 7 days (not 60)
- ✅ Latest transactions appear immediately
- ✅ Pagination issues resolved
- ✅ Deduplication works correctly
- ✅ Qatar trip dates excluded
- ✅ UI displays recent transactions
- ✅ Refresh uses correct range
- ✅ Auto-refresh mechanism works

**Regression Tests**:
- ✅ 7-day range remains hardcoded
- ✅ Performance stays acceptable
- ✅ No console errors
- ✅ User flows work end-to-end

### 2. Monzo Integration Tests (`monzo-integration.spec.ts`)

**Purpose**: Comprehensive testing of Monzo API integration

**API Endpoint Tests** (`/api/expenses`):
- ✅ Fetches Monzo transactions successfully
- ✅ Deduplication logic works
- ✅ Date filtering (Feb 1-7 Qatar trip excluded)
- ✅ New Monzo transactions have correct totals
- ✅ Expired token handling (graceful degradation)
- ✅ Response time < 3 seconds
- ✅ Cache mechanism works
- ✅ skipCache parameter forces fresh data
- ✅ Missing CSV handled gracefully
- ✅ lastUpdated timestamp correct

**UI Tests - Recent Transactions**:
- ✅ Section appears when new transactions exist
- ✅ Displays merchant, amount, date correctly
- ✅ Shows correct count and total
- ✅ Mobile view displays cards
- ✅ Qatar dates excluded from Recent section

**Dashboard Interaction Tests**:
- ✅ Refresh button updates timestamp
- ✅ Refresh shows spinning animation
- ✅ Button disabled during sync
- ✅ Work Lunches section correct
- ✅ Auto-refresh triggers (5 minutes)
- ✅ Loading skeleton displays
- ✅ Error states handled gracefully
- ✅ Empty state shown appropriately

**Edge Cases & Security**:
- ✅ Monzo unavailability handled
- ✅ No sensitive data in errors
- ✅ Date ranges validated
- ✅ Malformed parameters handled
- ✅ No XSS vulnerabilities
- ✅ Amount validation
- ✅ Decimal precision (2 places)
- ✅ includeMonzo=false excludes data

### 3. Essential QA Tests (`qa-essential.spec.ts`)

**Purpose**: Core functionality and visual regression tests

**Tests**:
- ✅ Dashboard loads with correct data
- ✅ Typography uses Inter font
- ✅ Dark theme colors applied
- ✅ Mobile responsive layout
- ✅ Accordion interactions
- ✅ Currency formatting
- ✅ Performance benchmarks

## Test Helpers & Fixtures

Location: `/tests/fixtures/test-helpers.ts`

### ExpenseFactory
Creates mock expense data for testing:
- `createExpense()` - Single expense
- `createExpenses()` - Multiple expenses
- `createMonzoExpense()` - Monzo transaction
- `createQatarTripExpenses()` - Qatar trip data

### APIResponseFactory
Creates mock API responses:
- `createExpenseSummary()` - Valid response
- `createEmptyResponse()` - No expenses
- `createCSVOnlyResponse()` - Without Monzo
- `createErrorResponse()` - Error state

### APIMockHelper
Mocks API endpoints:
- `mockExpensesAPI()` - Custom response
- `mockAPIFailure()` - Simulate error
- `mockSlowAPI()` - Test loading states
- `mockMonzoUnavailable()` - CSV only mode

### TestAssertions
Common validation helpers:
- `validateExpense()` - Expense structure
- `validateExpenseSummary()` - Response structure
- `findDuplicates()` - Detect duplicates
- `isQatarTripDate()` - Date validation
- `isRecentTransaction()` - Recent check

### WaitHelpers
Reliable wait mechanisms:
- `waitForExpensesAPI()` - API response
- `waitForDashboardLoad()` - Full page load
- `waitForAccordionAnimation()` - UI animations
- `waitForRefresh()` - Refresh completion

### DateHelpers
Date formatting (matches frontend):
- `formatDate()` - "Mon, 3 Feb" format
- `getDayName()` - Day name from date

### ConsoleTracker
Track console messages during tests:
- `startTracking()` - Begin tracking
- `getErrors()` - Get all errors
- `hasErrors()` - Check if any errors
- `reset()` - Clear tracker

## Best Practices

### 1. Use Explicit Waits
```typescript
// ✅ Good
await page.waitForSelector('h1:has-text("Expense Reports")');
await page.waitForResponse(res => res.url().includes('/api/expenses'));

// ❌ Bad
await page.waitForTimeout(2000);
```

### 2. Use Accessibility Selectors
```typescript
// ✅ Good
await page.getByRole('button', { name: /Recent Transactions/i });
await page.getByText('Work Lunches');

// ❌ Bad
await page.locator('.button-class-123');
await page.locator('xpath=//button[1]');
```

### 3. Validate API and UI Consistency
```typescript
const response = await page.waitForResponse(/* ... */);
const data = await response.json();

// Verify API data
expect(data.newMonzo.count).toBeGreaterThan(0);

// Verify UI reflects API data
const sectionText = await page.getByRole('button', { name: /Recent Transactions/i }).textContent();
expect(sectionText).toContain(`${data.newMonzo.count} items`);
```

### 4. Test Responsiveness
```typescript
// Desktop
await page.setViewportSize({ width: 1920, height: 1080 });

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
```

### 5. Handle Conditional UI
```typescript
if (data.newMonzo.count === 0) {
  console.log('⊘ No recent transactions to display');
  return; // Skip test if no data
}
```

## Security Testing

### Authentication
- ✅ Verify token refresh mechanism
- ✅ Test expired token handling
- ✅ Ensure graceful degradation

### Data Validation
- ✅ No sensitive data in error logs
- ✅ XSS prevention in merchant names
- ✅ Amount validation (positive numbers)
- ✅ Date format validation

### Error Handling
- ✅ API failures don't crash app
- ✅ Monzo unavailable → CSV only
- ✅ No stack traces to client

## Performance Benchmarks

- **Page Load**: < 3 seconds
- **API Response**: < 3 seconds
- **Refresh**: < 5 seconds
- **Animation**: 500ms accordions

## Debugging Failed Tests

### View trace
```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### View screenshots
```bash
ls test-results/
open test-results/critical-bug-fix-spec-ts-*/test-failed-1.png
```

### Run single test
```bash
npx playwright test --grep "CRITICAL: API fetches 7 days"
```

### Debug mode
```bash
npx playwright test --debug tests/critical-bug-fix.spec.ts
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Maintenance

### Adding New Tests

1. **Identify test category**: Critical, Integration, or QA
2. **Use existing helpers**: Import from `test-helpers.ts`
3. **Follow naming convention**: Descriptive test names
4. **Add documentation**: Update this README

### Updating After Code Changes

1. **Run all tests**: `npx playwright test`
2. **Fix failing tests**: Update selectors or assertions
3. **Add regression tests**: Prevent future breaks
4. **Update snapshots**: If visual changes are intentional

## Common Issues

### Port mismatch
- Ensure dev server runs on `http://localhost:3000`
- Update `playwright.config.ts` if port changes

### Flaky tests
- Use explicit waits, not arbitrary timeouts
- Check for race conditions
- Ensure proper test isolation

### Selector issues
- Prefer accessibility selectors (getByRole, getByText)
- Use data-testid for non-semantic elements
- Avoid brittle CSS selectors

### Network timing
- Use `waitForResponse()` for API calls
- Set appropriate timeouts (default: 30s)
- Mock slow APIs in tests

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Selector Guide](https://playwright.dev/docs/selectors)

## Contact

For questions about these tests or to report issues:
- Check test comments for specific test logic
- Review `test-helpers.ts` for available utilities
- See critical bug fix details in `critical-bug-fix.spec.ts` header
