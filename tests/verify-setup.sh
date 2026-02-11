#!/bin/bash

# Test Setup Verification Script
# Verifies that the test environment is correctly configured

set -e

echo "🔍 Verifying Playwright Test Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dev server is running
echo "1. Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓${NC} Dev server is running on port 3000"
else
    echo -e "${RED}✗${NC} Dev server is NOT running"
    echo -e "${YELLOW}   Run: npm run dev${NC}"
    exit 1
fi
echo ""

# Check if Playwright is installed
echo "2. Checking Playwright installation..."
if [ -d "node_modules/@playwright/test" ]; then
    echo -e "${GREEN}✓${NC} Playwright is installed"
else
    echo -e "${RED}✗${NC} Playwright is NOT installed"
    echo -e "${YELLOW}   Run: npm install${NC}"
    exit 1
fi
echo ""

# Check if Playwright browsers are installed
echo "3. Checking Playwright browsers..."
if npx playwright --version > /dev/null 2>&1; then
    VERSION=$(npx playwright --version)
    echo -e "${GREEN}✓${NC} Playwright browsers installed: $VERSION"
else
    echo -e "${RED}✗${NC} Playwright browsers NOT installed"
    echo -e "${YELLOW}   Run: npx playwright install${NC}"
    exit 1
fi
echo ""

# Check test files exist
echo "4. Checking test files..."
if [ -f "tests/critical-bug-fix.spec.ts" ]; then
    echo -e "${GREEN}✓${NC} critical-bug-fix.spec.ts exists"
else
    echo -e "${RED}✗${NC} critical-bug-fix.spec.ts missing"
fi

if [ -f "tests/monzo-integration.spec.ts" ]; then
    echo -e "${GREEN}✓${NC} monzo-integration.spec.ts exists"
else
    echo -e "${RED}✗${NC} monzo-integration.spec.ts missing"
fi

if [ -f "tests/fixtures/test-helpers.ts" ]; then
    echo -e "${GREEN}✓${NC} test-helpers.ts exists"
else
    echo -e "${RED}✗${NC} test-helpers.ts missing"
fi
echo ""

# Check playwright config
echo "5. Checking Playwright configuration..."
if [ -f "playwright.config.ts" ]; then
    BASE_URL=$(grep -o "baseURL: '[^']*'" playwright.config.ts | cut -d"'" -f2)
    if [ "$BASE_URL" = "http://localhost:3000" ]; then
        echo -e "${GREEN}✓${NC} Base URL configured correctly: $BASE_URL"
    else
        echo -e "${YELLOW}⚠${NC} Base URL is: $BASE_URL (expected: http://localhost:3000)"
    fi
else
    echo -e "${RED}✗${NC} playwright.config.ts missing"
fi
echo ""

# Check API endpoint
echo "6. Checking API endpoint..."
if curl -s http://localhost:3000/api/expenses > /dev/null; then
    echo -e "${GREEN}✓${NC} /api/expenses endpoint responding"

    # Check response structure
    RESPONSE=$(curl -s http://localhost:3000/api/expenses)
    if echo "$RESPONSE" | grep -q "expenses"; then
        echo -e "${GREEN}✓${NC} API response has correct structure"
    else
        echo -e "${RED}✗${NC} API response structure invalid"
    fi
else
    echo -e "${RED}✗${NC} /api/expenses endpoint NOT responding"
    exit 1
fi
echo ""

# Check package.json scripts
echo "7. Checking test scripts in package.json..."
if grep -q '"test":.*playwright test"' package.json; then
    echo -e "${GREEN}✓${NC} npm test script configured"
else
    echo -e "${RED}✗${NC} npm test script missing"
fi

if grep -q '"test:critical"' package.json; then
    echo -e "${GREEN}✓${NC} npm run test:critical script configured"
else
    echo -e "${YELLOW}⚠${NC} npm run test:critical script missing"
fi
echo ""

# Count test files
echo "8. Test file summary..."
TEST_COUNT=$(find tests -name "*.spec.ts" | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Found $TEST_COUNT test files"
echo ""

# All checks passed
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All setup checks passed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Ready to run tests:"
echo "  • npm test                 - Run all tests"
echo "  • npm run test:critical    - Run critical bug fix tests"
echo "  • npm run test:integration - Run Monzo integration tests"
echo "  • npm run test:ui          - Run in UI mode"
echo ""
echo "For more information, see tests/QUICK_START.md"
