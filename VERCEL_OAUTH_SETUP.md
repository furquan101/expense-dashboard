# Monzo OAuth Setup for Vercel Production

## Why OAuth Works on Localhost But Not Vercel

Your current setup uses:
```
MONZO_REDIRECT_URI=http://localhost:3000/api/monzo-oauth/callback
```

This only works locally. For Vercel, you need a production URL.

---

## Two Approaches

### Approach 1: Same OAuth Client (Easier)
Add production redirect URI to your existing OAuth client.

**Pros**: Single client, easier to manage
**Cons**: Development tokens work in production (less secure)

### Approach 2: Separate OAuth Clients (Recommended)
Create separate OAuth clients for dev and production.

**Pros**: Better security, isolated environments
**Cons**: More setup, need to manage two clients

---

## Setup Guide (Approach 1: Single Client)

### Step 1: Find Your Vercel Production URL

```bash
cd /Users/furquan.ahmad/expense-dashboard
vercel ls
```

Your production URL will be something like:
- `https://expense-dashboard.vercel.app` (production domain)
- `https://expense-dashboard-xyz123.vercel.app` (deployment URL)

**Use the production domain** (the shorter one without random characters).

### Step 2: Update Monzo OAuth Client

1. Go to https://developers.monzo.com/
2. Find your OAuth client
3. Add **second redirect URI**:
   ```
   https://expense-dashboard.vercel.app/api/monzo-oauth/callback
   ```
   *(Replace with your actual Vercel URL)*

Your client should now have **two redirect URIs**:
- `http://localhost:3000/api/monzo-oauth/callback` (for local dev)
- `https://expense-dashboard.vercel.app/api/monzo-oauth/callback` (for production)

**Note**: Some OAuth providers allow multiple redirect URIs. If Monzo only allows one, you'll need Approach 2 (separate clients).

### Step 3: Set Environment Variables in Vercel

```bash
# Using Vercel CLI
vercel env add MONZO_CLIENT_ID
# Paste: oauth2client_0000B3CyjIzkgMzbGQaZkK

vercel env add MONZO_CLIENT_SECRET
# Paste: mnzconf.VYicAmVPVBDutNgKuAbTzgf7zRPLU+zCNzodABztAy9uixnp1Vnjsy17aIc/YNuNNIVqAuePmvo460z+SfmooA==

vercel env add MONZO_REDIRECT_URI
# Paste: https://expense-dashboard.vercel.app/api/monzo-oauth/callback

vercel env add MONZO_ACCESS_TOKEN
# Leave empty initially: (press Enter)

vercel env add MONZO_REFRESH_TOKEN
# Leave empty initially: (press Enter)
```

**Or use Vercel Dashboard**:
1. Go to https://vercel.com/dashboard
2. Select your project: `expense-dashboard`
3. Go to Settings → Environment Variables
4. Add each variable above

**Important**: Select "Production" environment for these variables.

### Step 4: Deploy Updated Code

```bash
cd /Users/furquan.ahmad/expense-dashboard
git add .
git commit -m "Add OAuth support for production"
git push

# Vercel auto-deploys on push, or manually:
vercel --prod
```

### Step 5: Complete OAuth Flow on Production

1. Visit your production setup URL:
   ```
   https://expense-dashboard.vercel.app/api/monzo-oauth/setup
   ```

2. Copy the authorization URL from the JSON response

3. Open the URL in your browser

4. Complete the 2FA flow:
   - Check email for Monzo verification
   - Approve in Monzo app with PIN/Fingerprint/Face ID

5. You'll be redirected to:
   ```
   https://expense-dashboard.vercel.app/api/monzo-oauth/callback
   ```

6. Copy BOTH tokens from the JSON response

7. Add tokens to Vercel environment variables:
   ```bash
   vercel env add MONZO_ACCESS_TOKEN production
   # Paste the access token

   vercel env add MONZO_REFRESH_TOKEN production
   # Paste the refresh token
   ```

8. Redeploy to load new environment variables:
   ```bash
   vercel --prod
   ```

### Step 6: Verify Production

```bash
# Test production Monzo integration
curl https://expense-dashboard.vercel.app/api/monzo-debug | python3 -m json.tool

# Test production expenses API
curl "https://expense-dashboard.vercel.app/api/expenses?includeMonzo=true&skipCache=true" | python3 -m json.tool

# Open production dashboard
open https://expense-dashboard.vercel.app
```

---

## Setup Guide (Approach 2: Separate Clients)

### Step 1: Create Production OAuth Client

1. Go to https://developers.monzo.com/
2. Create **new OAuth client**:
   - **Name**: Expense Dashboard (Production)
   - **Redirect URI**: `https://expense-dashboard.vercel.app/api/monzo-oauth/callback`
   - **Type**: Confidential
   - **Status**: Live

3. Save the new credentials:
   - `PROD_CLIENT_ID`
   - `PROD_CLIENT_SECRET`

### Step 2: Keep Separate Environment Variables

**Local (.env.local)**:
```bash
# Development OAuth Client
MONZO_CLIENT_ID=oauth2client_0000B3CyjIzkgMzbGQaZkK
MONZO_CLIENT_SECRET=mnzconf.VYicAmVPVBDutNgKuAbTzgf7zRPLU+...
MONZO_REDIRECT_URI=http://localhost:3000/api/monzo-oauth/callback
MONZO_ACCESS_TOKEN=...
MONZO_REFRESH_TOKEN=...
```

**Vercel (Production Environment Variables)**:
```bash
# Production OAuth Client (different client ID)
MONZO_CLIENT_ID=oauth2client_XXXXXXXXXXXXXXX  # New prod client
MONZO_CLIENT_SECRET=mnzconf.YYYYYYYYYYYYYYY  # New prod secret
MONZO_REDIRECT_URI=https://expense-dashboard.vercel.app/api/monzo-oauth/callback
MONZO_ACCESS_TOKEN=...  # Will be filled after prod OAuth flow
MONZO_REFRESH_TOKEN=...  # Will be filled after prod OAuth flow
```

### Step 3: Complete OAuth Flow (Same as Approach 1, Step 5-6)

---

## Code Changes Required: None! ✅

Your current code already supports multiple environments:

```typescript
// lib/monzo-auth.ts automatically uses process.env values
const MONZO_CLIENT_ID = process.env.MONZO_CLIENT_ID || '';
const MONZO_REDIRECT_URI = process.env.MONZO_REDIRECT_URI || '';
```

Vercel will inject production environment variables automatically.

---

## Common Issues & Solutions

### Issue: Monzo only allows one redirect URI

**Solution**: Use Approach 2 (separate OAuth clients for dev/prod)

### Issue: "Redirect URI mismatch" error

**Solution**: Ensure the redirect URI in Monzo portal **exactly** matches:
- `https://expense-dashboard.vercel.app/api/monzo-oauth/callback`
- No trailing slash
- Check for http vs https
- Check for www vs non-www

### Issue: Environment variables not updating

**Solution**: After changing env vars in Vercel:
```bash
vercel --prod  # Force redeploy
```

Environment variables are only loaded at build/deploy time.

### Issue: OAuth works locally but not on Vercel

**Checklist**:
- [ ] Redirect URI in Monzo portal matches Vercel URL exactly
- [ ] All 5 environment variables set in Vercel dashboard
- [ ] Completed OAuth flow on production URL (not localhost)
- [ ] Redeployed after setting tokens

---

## Environment Variable Management

### Option A: Vercel CLI (Recommended)

```bash
# Add new variable
vercel env add VARIABLE_NAME

# List all variables
vercel env ls

# Pull production env vars to local (for inspection)
vercel env pull .env.production

# Remove variable
vercel env rm VARIABLE_NAME
```

### Option B: Vercel Dashboard

1. https://vercel.com/dashboard
2. Select project
3. Settings → Environment Variables
4. Add/Edit/Remove variables

**Remember**: Always redeploy after changing env vars!

---

## Security Considerations

### ✅ Good Practices

- Use separate OAuth clients for dev/prod
- Never commit tokens to git (.env.local is in .gitignore)
- Use Vercel's encrypted environment variables
- Rotate tokens if exposed

### ⚠️ Current Risks

- CSV file reading might not work on Vercel (filesystem is read-only)
- Consider moving to database or cloud storage for production
- Tokens stored in Vercel env vars (secure, but consider secret management)

---

## Testing Production OAuth

### Quick Test Script

```bash
#!/bin/bash

PROD_URL="https://expense-dashboard.vercel.app"

echo "Testing Production Monzo OAuth..."

# Test 1: Check configuration
echo "1. Configuration:"
curl -s "$PROD_URL/api/monzo-oauth/diagnose" | python3 -m json.tool

# Test 2: Monzo debug endpoint
echo -e "\n2. Monzo Integration:"
curl -s "$PROD_URL/api/monzo-debug" | python3 -m json.tool

# Test 3: Expenses API
echo -e "\n3. Expenses API:"
curl -s "$PROD_URL/api/expenses?includeMonzo=true&skipCache=true" | python3 -m json.tool | head -30

echo -e "\n✓ Tests complete!"
```

Save as `test-production.sh` and run:
```bash
chmod +x test-production.sh
./test-production.sh
```

---

## Next Steps

1. **Choose your approach**:
   - Single client (easier) → Follow "Approach 1"
   - Separate clients (recommended) → Follow "Approach 2"

2. **Set up production OAuth**:
   ```bash
   # Get your Vercel URL
   vercel ls

   # Add redirect URI to Monzo client
   # (Do this in Monzo Developer Portal)

   # Set environment variables
   vercel env add MONZO_CLIENT_ID
   # ... (follow Step 3 above)
   ```

3. **Complete OAuth flow on production**:
   ```bash
   open https://expense-dashboard.vercel.app/api/monzo-oauth/setup
   # Follow the authorization flow
   ```

4. **Verify it works**:
   ```bash
   curl https://expense-dashboard.vercel.app/api/monzo-debug
   ```

---

## Additional Considerations for Production

### CSV File Reading

Your app currently reads CSV from `~/Downloads/coupa_expenses.csv`. This **won't work on Vercel** because:
- Vercel deployments have read-only filesystem
- No access to your local Downloads folder

**Solutions**:
1. Upload CSV via API endpoint
2. Use file upload form in the UI
3. Store in database (Vercel Postgres, Supabase, etc.)
4. Use cloud storage (S3, Vercel Blob, etc.)

Want me to implement one of these solutions?

---

## Summary

| Step | Local | Vercel |
|------|-------|--------|
| Redirect URI | `http://localhost:3000/...` | `https://expense-dashboard.vercel.app/...` |
| OAuth Client | Dev client | Same or separate client |
| Env Vars | `.env.local` file | Vercel dashboard |
| OAuth Flow | `localhost:3000/api/monzo-oauth/setup` | `expense-dashboard.vercel.app/api/monzo-oauth/setup` |
| Code Changes | None needed | None needed |

**The code is already production-ready!** Just need to configure the environment.
