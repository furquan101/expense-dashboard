# Quick Start Guide - Running Tests

## Prerequisites

1. **Dev server must be running**:
   ```bash
   npm run dev
   ```
   Server should be at: `http://localhost:3000`

2. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

## Run Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run critical bug fix tests only
npm run test:critical

# Run Monzo integration tests
npm run test:integration

# Run in UI mode (recommended for development)
npm run test:ui

# Run with visible browser
npm run test:headed

# Debug mode
npm run test:debug

# View HTML report
npm run test:report
```

### Detailed Commands

```bash
# Run specific test file
npx playwright test tests/critical-bug-fix.spec.ts

# Run specific test by name
npx playwright test --grep "CRITICAL: API fetches 7 days"

# Run in headed mode (see browser)
npx playwright test --headed

# Run with debug
npx playwright test --debug

# Generate and open report
npx playwright test
npx playwright show-report
```

## Expected Output

### All Tests Passing
```
Running 45 tests using 1 worker

  ✓ tests/critical-bug-fix.spec.ts:15:3 › CRITICAL: API fetches 7 days (2.3s)
  ✓ tests/critical-bug-fix.spec.ts:45:3 › CRITICAL: Latest transactions appear (1.8s)
  ✓ tests/monzo-integration.spec.ts:25:3 › API fetches Monzo transactions (1.5s)
  ...

  45 passed (2.3m)
```

## Test Categories

### 1. Critical Bug Fix Tests
**File**: `tests/critical-bug-fix.spec.ts`
**Focus**: Verifying 7-day fetch range fix

```bash
npm run test:critical
```

**What it tests**:
- ✅ 7-day range (not 60 days)
- ✅ Latest transactions display
- ✅ No pagination issues
- ✅ Deduplication works
- ✅ Qatar dates excluded
- ✅ Regression prevention

### 2. Monzo Integration Tests
**File**: `tests/monzo-integration.spec.ts`
**Focus**: Comprehensive Monzo API integration

```bash
npm run test:integration
```

**What it tests**:
- ✅ API endpoint functionality
- ✅ UI displays correctly
- ✅ Refresh mechanism
- ✅ Edge cases
- ✅ Security checks

### 3. Essential QA Tests
**File**: `tests/qa-essential.spec.ts`
**Focus**: Core functionality

```bash
npx playwright test tests/qa-essential.spec.ts
```

## Troubleshooting

### Dev server not running
**Error**: `page.goto: net::ERR_CONNECTION_REFUSED`

**Fix**:
```bash
# In another terminal
npm run dev
```

### Port mismatch
**Error**: Tests expect port 3002 but server is on 3000

**Fix**: Already fixed in `playwright.config.ts` - baseURL is `http://localhost:3000`

### No Monzo data in tests
**Message**: `⊘ No recent transactions to display`

**Explanation**: Some tests are conditional - they skip if no Monzo data exists. This is expected behavior for graceful handling.

### Flaky tests
**Issue**: Tests pass sometimes, fail others

**Fix**:
- Use `waitForLoadState('networkidle')`
- Increase timeout for slow networks
- Check API response times

## Viewing Test Results

### HTML Report
```bash
npm run test:report
```
Opens interactive HTML report in browser with:
- Test execution timeline
- Screenshots of failures
- Video recordings
- Traces for debugging

### Terminal Output
Tests show:
- ✅ Pass with green checkmark
- ❌ Fail with red X
- ⊘ Skipped tests

### Test Artifacts
Located in `test-results/`:
- Screenshots: `test-failed-1.png`
- Videos: `video.webm`
- Traces: `trace.zip`

## CI/CD

### Running in GitHub Actions
Already configured in `playwright.config.ts`:
- Retries: 2
- Workers: 1 (in CI)
- Screenshots on failure
- Video on failure

### Local CI simulation
```bash
CI=true npx playwright test
```

## Common Test Scenarios

### Verify bug fix is working
```bash
npm run test:critical
```
Look for: "CRITICAL FIX VERIFIED" messages

### Check API integration
```bash
npm run test:integration
```
Tests all API endpoints and data flow

### Debug failing test
```bash
npm run test:debug
```
Opens Playwright Inspector for step-by-step debugging

### Check mobile responsiveness
```bash
npx playwright test --grep "mobile"
```

## Test Data

### API Mock Data
Tests use `test-helpers.ts` to create mock data:
- Work lunches from Kings Cross
- Qatar trip expenses (Feb 1-7)
- Recent Monzo transactions (Feb 10+)

### Real Data
Tests run against real `/api/expenses` endpoint, so results depend on:
- CSV file contents
- Monzo API availability
- Access token validity

## Performance Benchmarks

Expected test durations:
- **Critical tests**: ~1-3s per test
- **Integration tests**: ~1-2s per test
- **Full suite**: ~2-4 minutes

If tests take longer:
- Check network speed
- Check CPU load
- Consider running fewer workers

## Next Steps

1. **Run critical tests first**:
   ```bash
   npm run test:critical
   ```

2. **View in UI mode** (recommended):
   ```bash
   npm run test:ui
   ```

3. **Check the full test report**:
   ```bash
   npm test
   npm run test:report
   ```

## Need Help?

- **Test Documentation**: See `tests/README.md`
- **Test Helpers**: See `tests/fixtures/test-helpers.ts`
- **Playwright Docs**: https://playwright.dev/
- **Issue**: Check console output for specific error messages
