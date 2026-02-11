#!/bin/bash

# Vercel OAuth Setup Script
# Helps configure Monzo OAuth for Vercel production

set -e

echo "================================"
echo "Vercel OAuth Setup for Monzo"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}✗ Vercel CLI not found${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g vercel"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Vercel CLI found${NC}"
echo ""

# Get Vercel project info
echo -e "${BLUE}Step 1: Getting Vercel project info...${NC}"
echo ""

VERCEL_URL=$(vercel ls 2>/dev/null | grep "expense-dashboard" | grep "Ready" | head -1 | awk '{print $2}')

if [ -z "$VERCEL_URL" ]; then
    echo -e "${YELLOW}⚠ Could not auto-detect Vercel URL${NC}"
    echo ""
    read -p "Enter your Vercel production URL (e.g., expense-dashboard.vercel.app): " VERCEL_URL
fi

echo -e "${GREEN}Production URL: ${VERCEL_URL}${NC}"
echo ""

# Construct redirect URI
REDIRECT_URI="https://${VERCEL_URL}/api/monzo-oauth/callback"

echo "Redirect URI will be:"
echo -e "${BLUE}${REDIRECT_URI}${NC}"
echo ""

# Ask which approach
echo -e "${YELLOW}Choose your approach:${NC}"
echo ""
echo "1. Single OAuth client (same client for dev and prod)"
echo "   → Easier to manage"
echo "   → Add production redirect URI to existing client"
echo ""
echo "2. Separate OAuth clients (different clients for dev and prod)"
echo "   → Recommended for production"
echo "   → Better security and isolation"
echo ""

read -p "Enter choice (1 or 2): " APPROACH

if [ "$APPROACH" = "2" ]; then
    echo ""
    echo -e "${YELLOW}Separate OAuth Client Approach${NC}"
    echo "────────────────────────────────────────────────────"
    echo ""
    echo "Before continuing:"
    echo "1. Go to https://developers.monzo.com/"
    echo "2. Create a NEW OAuth client:"
    echo "   - Name: Expense Dashboard (Production)"
    echo "   - Redirect URI: ${REDIRECT_URI}"
    echo "   - Type: Confidential"
    echo "   - Status: Live"
    echo "3. Copy the NEW client ID and secret"
    echo ""
    read -p "Press Enter when you've created the production OAuth client..."
    echo ""
else
    echo ""
    echo -e "${YELLOW}Single OAuth Client Approach${NC}"
    echo "────────────────────────────────────────────────────"
    echo ""
    echo "Before continuing:"
    echo "1. Go to https://developers.monzo.com/"
    echo "2. Edit your EXISTING OAuth client"
    echo "3. ADD this redirect URI (keep the localhost one too):"
    echo "   ${REDIRECT_URI}"
    echo "4. Save the changes"
    echo ""
    read -p "Press Enter when you've updated the redirect URI..."
    echo ""
fi

# Get credentials
echo -e "${BLUE}Step 2: Enter Monzo OAuth credentials${NC}"
echo ""

if [ "$APPROACH" = "2" ]; then
    echo "Enter your NEW production OAuth credentials:"
else
    echo "Enter your existing OAuth credentials:"
fi
echo ""

read -p "MONZO_CLIENT_ID: " CLIENT_ID
read -p "MONZO_CLIENT_SECRET: " CLIENT_SECRET

# Set environment variables
echo ""
echo -e "${BLUE}Step 3: Setting Vercel environment variables...${NC}"
echo ""

# Function to set env var
set_env_var() {
    local name=$1
    local value=$2
    local env=$3  # production, preview, or development

    echo "Setting ${name}..."
    echo "$value" | vercel env add "$name" "$env" 2>/dev/null || {
        echo -e "${YELLOW}⚠ ${name} may already exist, updating...${NC}"
        vercel env rm "$name" "$env" -y 2>/dev/null || true
        echo "$value" | vercel env add "$name" "$env"
    }
}

# Set variables for production
echo "Adding to Production environment..."
set_env_var "MONZO_CLIENT_ID" "$CLIENT_ID" "production"
set_env_var "MONZO_CLIENT_SECRET" "$CLIENT_SECRET" "production"
set_env_var "MONZO_REDIRECT_URI" "$REDIRECT_URI" "production"

# Set empty tokens (will be filled after OAuth flow)
echo "" | vercel env add "MONZO_ACCESS_TOKEN" "production" 2>/dev/null || true
echo "" | vercel env add "MONZO_REFRESH_TOKEN" "production" 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Environment variables set${NC}"
echo ""

# Deploy
echo -e "${BLUE}Step 4: Deploying to production...${NC}"
echo ""

read -p "Deploy now? (y/n): " DEPLOY

if [ "$DEPLOY" = "y" ] || [ "$DEPLOY" = "Y" ]; then
    vercel --prod
    echo ""
    echo -e "${GREEN}✓ Deployed to production${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠ Skipped deployment${NC}"
    echo "Deploy manually with: vercel --prod"
fi

echo ""

# OAuth flow instructions
echo -e "${YELLOW}Step 5: Complete OAuth authorization flow${NC}"
echo "────────────────────────────────────────────────────"
echo ""
echo "Now you need to authorize your production app:"
echo ""
echo "1. Open this URL:"
echo -e "${BLUE}https://${VERCEL_URL}/api/monzo-oauth/setup${NC}"
echo ""
echo "2. Copy the 'authorizationUrl' from the JSON response"
echo ""
echo "3. Open that URL in your browser"
echo ""
echo "4. Complete the 2FA flow:"
echo "   - Check email for Monzo verification"
echo "   - Approve in Monzo app with PIN/Fingerprint/Face ID"
echo ""
echo "5. You'll be redirected to:"
echo "   https://${VERCEL_URL}/api/monzo-oauth/callback"
echo ""
echo "6. Copy BOTH tokens from the JSON response"
echo ""
echo "7. Add them to Vercel:"
echo "   vercel env add MONZO_ACCESS_TOKEN production"
echo "   vercel env add MONZO_REFRESH_TOKEN production"
echo ""
echo "8. Redeploy:"
echo "   vercel --prod"
echo ""

read -p "Press Enter to open the setup URL now..."
open "https://${VERCEL_URL}/api/monzo-oauth/setup"

echo ""
echo "================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "  1. Complete the OAuth flow (see instructions above)"
echo "  2. Add tokens to Vercel environment variables"
echo "  3. Redeploy: vercel --prod"
echo "  4. Test: curl https://${VERCEL_URL}/api/monzo-debug"
echo ""
echo "For detailed guide, see:"
echo "  cat VERCEL_OAUTH_SETUP.md"
echo ""
