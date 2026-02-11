#!/bin/bash

# Monzo OAuth Fix Script
# Guides through the complete OAuth setup process

set -e

echo "================================"
echo "Monzo OAuth Fix - Long Term Solution"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}Step 1: Checking if dev server is running...${NC}"
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dev server is running on port 3000${NC}"
else
    echo -e "${RED}✗ Dev server is not running${NC}"
    echo "Please start it with: npm run dev"
    exit 1
fi
echo ""

# Run diagnostics
echo -e "${BLUE}Step 2: Running diagnostics...${NC}"
DIAG_RESPONSE=$(curl -s http://localhost:3000/api/monzo-oauth/diagnose)
echo "$DIAG_RESPONSE" | python3 -m json.tool
echo ""

# Check for configuration issues
if echo "$DIAG_RESPONSE" | grep -q "No issues detected"; then
    echo -e "${GREEN}✓ Configuration format looks correct${NC}"
else
    echo -e "${YELLOW}⚠ Configuration issues detected${NC}"
fi
echo ""

# Instructions for Monzo Portal
echo -e "${YELLOW}Step 3: Verify OAuth Client in Monzo Developer Portal${NC}"
echo "────────────────────────────────────────────────────"
echo ""
echo "1. Open in browser: https://developers.monzo.com/"
echo "2. Navigate to 'OAuth Clients' or 'Clients'"
echo "3. Check your OAuth client settings:"
echo ""
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │ Required Settings:                              │"
echo "   │                                                 │"
echo "   │ • Status: Live (not Test/Pending)               │"
echo "   │ • Type: Confidential (for refresh tokens)       │"
echo "   │ • Redirect URI:                                 │"
echo "   │   http://localhost:3000/api/monzo-oauth/callback│"
echo "   │                                                 │"
echo "   └─────────────────────────────────────────────────┘"
echo ""
echo -e "${RED}If the client has issues or isn't visible:${NC}"
echo "  → Delete it and create a new one"
echo "  → Update CLIENT_ID and CLIENT_SECRET in .env.local"
echo "  → Restart this script"
echo ""

read -p "Press Enter when you've verified the OAuth client settings..."
echo ""

# Get authorization URL
echo -e "${BLUE}Step 4: Getting authorization URL...${NC}"
SETUP_RESPONSE=$(curl -s http://localhost:3000/api/monzo-oauth/setup)
AUTH_URL=$(echo "$SETUP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('authorizationUrl', ''))")

if [ -z "$AUTH_URL" ]; then
    echo -e "${RED}✗ Failed to get authorization URL${NC}"
    echo "Response:"
    echo "$SETUP_RESPONSE" | python3 -m json.tool
    exit 1
fi

echo -e "${GREEN}✓ Authorization URL generated${NC}"
echo ""

# Display authorization URL
echo -e "${YELLOW}Step 5: Complete OAuth Authorization${NC}"
echo "────────────────────────────────────────────────────"
echo ""
echo "Authorization URL:"
echo -e "${BLUE}$AUTH_URL${NC}"
echo ""
echo "What will happen:"
echo "  1. Browser opens to Monzo authorization page"
echo "  2. You'll receive an email from Monzo → click link"
echo "  3. Open Monzo app on phone → notification appears"
echo "  4. Authorize with PIN/Fingerprint/Face ID"
echo "  5. Browser redirects back with tokens"
echo ""

read -p "Press Enter to open the authorization URL in your browser..."
open "$AUTH_URL"

echo ""
echo -e "${YELLOW}Waiting for authorization...${NC}"
echo ""
echo "Steps to complete in parallel:"
echo "  ☐ Check your email for Monzo verification"
echo "  ☐ Check Monzo app for authorization notification"
echo "  ☐ Approve with PIN/Fingerprint/Face ID"
echo ""
echo "After authorization, you'll be redirected to:"
echo "  http://localhost:3000/api/monzo-oauth/callback"
echo ""
echo "The page will show JSON with your tokens."
echo ""

read -p "Press Enter after you've completed authorization and have the tokens..."
echo ""

# Guide for updating .env.local
echo -e "${YELLOW}Step 6: Update .env.local with tokens${NC}"
echo "────────────────────────────────────────────────────"
echo ""
echo "1. Copy BOTH tokens from the browser:"
echo "   - MONZO_ACCESS_TOKEN"
echo "   - MONZO_REFRESH_TOKEN"
echo ""
echo "2. Edit .env.local:"
echo "   nano /Users/furquan.ahmad/expense-dashboard/.env.local"
echo ""
echo "3. Update these lines:"
echo "   MONZO_ACCESS_TOKEN=<paste_access_token_here>"
echo "   MONZO_REFRESH_TOKEN=<paste_refresh_token_here>"
echo ""
echo "4. Save and exit (Ctrl+O, Enter, Ctrl+X)"
echo ""

read -p "Press Enter after you've updated .env.local..."
echo ""

# Verify tokens are set
echo -e "${BLUE}Step 7: Verifying tokens...${NC}"
if grep -q "MONZO_REFRESH_TOKEN=.\+" /Users/furquan.ahmad/expense-dashboard/.env.local; then
    echo -e "${GREEN}✓ MONZO_REFRESH_TOKEN is set${NC}"
else
    echo -e "${RED}✗ MONZO_REFRESH_TOKEN appears empty${NC}"
fi

if grep -q "MONZO_ACCESS_TOKEN=.\+" /Users/furquan.ahmad/expense-dashboard/.env.local; then
    echo -e "${GREEN}✓ MONZO_ACCESS_TOKEN is set${NC}"
else
    echo -e "${RED}✗ MONZO_ACCESS_TOKEN appears empty${NC}"
fi
echo ""

# Restart instructions
echo -e "${YELLOW}Step 8: Restart Dev Server${NC}"
echo "────────────────────────────────────────────────────"
echo ""
echo "You need to restart the dev server to load new tokens:"
echo ""
echo "1. Stop current server: Ctrl+C in the terminal running npm"
echo "2. Start again: npm run dev"
echo ""

read -p "Press Enter after you've restarted the server..."
echo ""

# Test the integration
echo -e "${BLUE}Step 9: Testing Monzo integration...${NC}"
sleep 2

echo ""
echo "Test 1: Monzo Debug Endpoint"
echo "─────────────────────────────"
MONZO_DEBUG=$(curl -s http://localhost:3000/api/monzo-debug)
echo "$MONZO_DEBUG" | python3 -m json.tool

if echo "$MONZO_DEBUG" | grep -q '"success".*true'; then
    echo -e "${GREEN}✓ Monzo integration working!${NC}"
else
    echo -e "${RED}✗ Monzo integration failed${NC}"
    echo "Check the error above for details"
fi
echo ""

echo "Test 2: Expenses API"
echo "────────────────────"
EXPENSES=$(curl -s "http://localhost:3000/api/expenses?includeMonzo=true&skipCache=true")
echo "$EXPENSES" | python3 -m json.tool | head -20

if echo "$EXPENSES" | grep -q '"newMonzo"'; then
    echo -e "${GREEN}✓ Expenses API includes Monzo data!${NC}"
else
    echo -e "${YELLOW}⚠ Expenses API may not include Monzo data${NC}"
fi
echo ""

# Final success
echo "================================"
echo -e "${GREEN}OAuth Setup Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "  • Open http://localhost:3000 to view dashboard"
echo "  • Tokens will auto-refresh every ~5 hours"
echo "  • Monitor console logs for refresh messages"
echo ""
echo "If issues persist, see:"
echo "  • MONZO_OAUTH_FIX.md for detailed troubleshooting"
echo "  • https://community.monzo.com/c/developers/"
echo ""
