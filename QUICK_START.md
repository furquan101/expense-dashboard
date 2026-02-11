# Quick Start: Fix Monzo OAuth (Long-Term Solution)

## TL;DR - Two Options

### Option A: Guided Interactive Script (Recommended)
```bash
cd /Users/furquan.ahmad/expense-dashboard
./fix-monzo-oauth.sh
```
This script will guide you through each step interactively.

### Option B: Manual Fix
Follow the detailed guide in `MONZO_OAUTH_FIX.md`

---

## Why OAuth Keeps Failing

The error **"We couldn't identify who you'd like to connect your account with"** means:
- OAuth client in Monzo Developer Portal has configuration issues
- NOT a code problem - the implementation is correct
- Common causes:
  - Client not in "Live" status
  - Client not associated with your account
  - Redirect URI mismatch
  - Client type incorrect (needs "Confidential")

---

## The Fix (Manual Steps)

### 1. Check Monzo Developer Portal

Visit https://developers.monzo.com/ and verify:

```
┌─────────────────────────────────────────┐
│ OAuth Client Settings:                  │
│                                         │
│ ✓ Status: Live                          │
│ ✓ Type: Confidential                    │
│ ✓ Redirect URI:                         │
│   http://localhost:3000/api/            │
│   monzo-oauth/callback                  │
│                                         │
│ If ANY setting is wrong:                │
│ → Delete client                         │
│ → Create new one                        │
│ → Update .env.local with new credentials│
└─────────────────────────────────────────┘
```

### 2. Get Authorization URL

```bash
curl http://localhost:3000/api/monzo-oauth/setup | python3 -m json.tool
```

Copy the `authorizationUrl` and open it in your browser.

### 3. Complete 2FA Flow

1. **Email**: Check inbox for Monzo verification
2. **Monzo App**: Check phone for notification
3. **Authorize**: Confirm with PIN/Fingerprint/Face ID
4. **Redirect**: Browser returns to localhost with tokens

### 4. Update .env.local

After redirect, copy BOTH tokens and update `.env.local`:

```bash
MONZO_ACCESS_TOKEN=eyJhbGc...
MONZO_REFRESH_TOKEN=...
```

### 5. Restart & Test

```bash
# Restart server
npm run dev

# Test integration
curl http://localhost:3000/api/monzo-debug | python3 -m json.tool
```

---

## Diagnostic Tools

```bash
# Check configuration
curl http://localhost:3000/api/monzo-oauth/diagnose | python3 -m json.tool

# Get auth URL
curl http://localhost:3000/api/monzo-oauth/setup | python3 -m json.tool

# Test Monzo API
curl http://localhost:3000/api/monzo-debug | python3 -m json.tool

# Test full expenses
curl "http://localhost:3000/api/expenses?includeMonzo=true&skipCache=true" | python3 -m json.tool
```

---

## Success Indicators

You'll know it's working when:
- ✅ No errors in console logs
- ✅ `curl http://localhost:3000/api/monzo-debug` returns transactions
- ✅ Dashboard shows "Recent Transactions" section
- ✅ Console logs show "Token refreshed successfully" every ~5 hours

---

## Setting Up for Vercel Production

Want to deploy to Vercel? Run:

```bash
./setup-vercel-oauth.sh
```

Or read the detailed guide: `VERCEL_OAUTH_SETUP.md`

**Key differences for Vercel:**
- Different redirect URI (your-app.vercel.app instead of localhost)
- Environment variables set in Vercel dashboard
- Complete OAuth flow on production URL
- Optional: Use separate OAuth client for production

---

## Still Not Working?

1. **Read detailed guide**: `MONZO_OAUTH_FIX.md`
2. **Check Monzo Community**: https://community.monzo.com/c/developers/
3. **Contact Monzo Support**: If portal issues persist
4. **Temporary fallback**: Use API Playground token (expires in 5 hours)

---

## Benefits After Fix

- 🔄 **Auto-refresh**: Tokens renew automatically
- 🔒 **Secure**: Proper OAuth2 flow
- 🚀 **Production-ready**: Works long-term
- 💪 **Reliable**: No manual token updates

---

## Temporary Alternative (If Urgent)

If you need it working RIGHT NOW while debugging OAuth:

1. Get token from https://developers.monzo.com/ API Playground
2. Add to `.env.local`: `MONZO_ACCESS_TOKEN=<token>`
3. Comment out: `MONZO_REFRESH_TOKEN=`
4. Restart server

**Note**: Expires in 5 hours, need manual refresh.

---

## Files Added

- `MONZO_OAUTH_FIX.md` - Detailed troubleshooting guide
- `fix-monzo-oauth.sh` - Interactive setup script
- `app/api/monzo-oauth/diagnose/route.ts` - Configuration checker
- This file (`QUICK_START.md`) - Quick reference

---

## Next: Run the Script

```bash
cd /Users/furquan.ahmad/expense-dashboard
./fix-monzo-oauth.sh
```

The script will guide you through everything step-by-step!
