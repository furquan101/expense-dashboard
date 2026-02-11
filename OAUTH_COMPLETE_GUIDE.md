# Complete OAuth Setup Guide - Local & Production

## Quick Answer: Why Can't I Configure Auth for Vercel?

**You CAN!** 🎉

You just need to:
1. Add your Vercel URL to the Monzo OAuth redirect URI
2. Set environment variables in Vercel dashboard
3. Complete the OAuth flow on your production URL

Your code is already production-ready - it's just environment configuration.

---

## Overview: Three OAuth Setup Scenarios

| Scenario | Guide | Script | Time |
|----------|-------|--------|------|
| **Local Development** | `MONZO_OAUTH_FIX.md` | `./fix-monzo-oauth.sh` | 10 min |
| **Vercel Production** | `VERCEL_OAUTH_SETUP.md` | `./setup-vercel-oauth.sh` | 15 min |
| **Quick Temporary** | `QUICK_START.md` | API Playground token | 5 min |

---

## Choose Your Path

### Path A: Fix Local OAuth First (Recommended)

**Start here if**: Local OAuth is currently broken

```bash
cd /Users/furquan.ahmad/expense-dashboard

# Step 1: Fix local OAuth
./fix-monzo-oauth.sh

# Step 2: Then set up Vercel
./setup-vercel-oauth.sh
```

**Why this order?**
- Test OAuth flow locally first (faster iteration)
- Understand the process before production
- Easier to debug issues locally

### Path B: Set Up Vercel Directly

**Choose this if**: Local OAuth already works, just need production

```bash
cd /Users/furquan.ahmad/expense-dashboard
./setup-vercel-oauth.sh
```

### Path C: Quick Temporary Fix

**Choose this if**: Need something working RIGHT NOW

1. Get token from https://developers.monzo.com/ API Playground
2. Add to `.env.local`: `MONZO_ACCESS_TOKEN=<token>`
3. Restart server

**Trade-off**: Expires in 5 hours, need manual refresh

---

## Understanding the Difference: Local vs Vercel

### What's the Same ✅

- **Code**: No changes needed - works in both environments
- **OAuth flow**: Same authorization process
- **Tokens**: Same access/refresh token mechanism
- **API calls**: Same Monzo API endpoints

### What's Different ⚠️

| Aspect | Local | Vercel |
|--------|-------|--------|
| **Redirect URI** | `http://localhost:3000/...` | `https://your-app.vercel.app/...` |
| **Environment Variables** | `.env.local` file | Vercel dashboard |
| **OAuth Client** | Can use same | Can use same OR separate |
| **Authorization URL** | `localhost:3000/api/monzo-oauth/setup` | `your-app.vercel.app/api/monzo-oauth/setup` |
| **File System** | Full access | Read-only (CSV won't work) |

---

## Detailed Setup Comparison

### Local OAuth Setup

```bash
# 1. Configure Monzo portal
Redirect URI: http://localhost:3000/api/monzo-oauth/callback

# 2. Set .env.local
MONZO_CLIENT_ID=oauth2client_...
MONZO_CLIENT_SECRET=mnzconf....
MONZO_REDIRECT_URI=http://localhost:3000/api/monzo-oauth/callback

# 3. Run OAuth flow
curl http://localhost:3000/api/monzo-oauth/setup
# → Open authorization URL
# → Complete 2FA
# → Get tokens

# 4. Update .env.local with tokens
MONZO_ACCESS_TOKEN=eyJhbGc...
MONZO_REFRESH_TOKEN=...

# 5. Restart and test
npm run dev
curl http://localhost:3000/api/monzo-debug
```

### Vercel OAuth Setup

```bash
# 1. Configure Monzo portal
Redirect URI: https://expense-dashboard.vercel.app/api/monzo-oauth/callback

# 2. Set Vercel environment variables
vercel env add MONZO_CLIENT_ID
vercel env add MONZO_CLIENT_SECRET
vercel env add MONZO_REDIRECT_URI

# 3. Deploy
vercel --prod

# 4. Run OAuth flow on production
curl https://expense-dashboard.vercel.app/api/monzo-oauth/setup
# → Open authorization URL
# → Complete 2FA
# → Get tokens

# 5. Add tokens to Vercel
vercel env add MONZO_ACCESS_TOKEN
vercel env add MONZO_REFRESH_TOKEN

# 6. Redeploy
vercel --prod

# 7. Test
curl https://expense-dashboard.vercel.app/api/monzo-debug
```

---

## Can I Use One OAuth Client for Both?

### Yes! (Single Client Approach)

**If Monzo allows multiple redirect URIs:**

In Monzo portal, set both redirect URIs:
```
1. http://localhost:3000/api/monzo-oauth/callback
2. https://expense-dashboard.vercel.app/api/monzo-oauth/callback
```

Then use the same `CLIENT_ID` and `CLIENT_SECRET` in both environments.

**Pros:**
- ✅ Simpler to manage
- ✅ Only one client to maintain

**Cons:**
- ⚠️ Less secure (dev tokens could work in prod)
- ⚠️ Harder to revoke per-environment

### Better: Separate Clients (Recommended)

**Create two OAuth clients:**

**Client 1 - Development:**
- Name: Expense Dashboard (Dev)
- Redirect: `http://localhost:3000/api/monzo-oauth/callback`

**Client 2 - Production:**
- Name: Expense Dashboard (Production)
- Redirect: `https://expense-dashboard.vercel.app/api/monzo-oauth/callback`

Use different credentials in each environment.

**Pros:**
- ✅ Better security
- ✅ Isolated environments
- ✅ Can revoke independently

**Cons:**
- ⚠️ More setup
- ⚠️ Two clients to manage

---

## Common Questions

### Q: Will my local tokens work on Vercel?

**No.** Tokens are tied to the OAuth client and user. You need to:
- Complete the OAuth flow separately for production
- Get new tokens specifically for Vercel

### Q: Do I need to redeploy when tokens expire?

**No!** The app auto-refreshes tokens every ~5 hours using the refresh token. No manual intervention needed.

### Q: What if I don't have Vercel CLI installed?

```bash
npm install -g vercel

# Then login
vercel login
```

### Q: Can I use a custom domain?

**Yes!** Add your custom domain in Vercel, then:
1. Update Monzo redirect URI to your custom domain
2. Update `MONZO_REDIRECT_URI` in Vercel env vars
3. Redeploy

### Q: How do I rotate/refresh production tokens?

**Option 1: Automatic (built-in)**
- Tokens auto-refresh every ~5 hours
- No action needed

**Option 2: Manual (if needed)**
- Re-run OAuth flow on production
- Update tokens in Vercel env vars
- Redeploy

### Q: What about CSV file reading in production?

**Problem**: Vercel has read-only filesystem. CSV reading from local files won't work.

**Solutions**:
1. **File upload API**: Upload CSV via HTTP POST
2. **File upload form**: Add UI for CSV upload
3. **Database**: Store expenses in Postgres/Supabase
4. **Cloud storage**: Use S3/Vercel Blob

Want me to implement one of these? Just ask!

---

## Security Best Practices

### ✅ Do This

- Use separate OAuth clients for dev/prod
- Never commit `.env.local` to git (already in `.gitignore`)
- Use Vercel's encrypted environment variables
- Rotate tokens if exposed
- Use HTTPS in production (Vercel does this automatically)

### ❌ Avoid This

- Don't share OAuth credentials
- Don't commit tokens to git
- Don't use production tokens in development
- Don't expose client secret in frontend code
- Don't skip the refresh token (need it for auto-refresh)

---

## Troubleshooting

### Local OAuth Fails

```bash
# Run diagnostics
curl http://localhost:3000/api/monzo-oauth/diagnose | python3 -m json.tool

# Check Monzo portal settings
# See: MONZO_OAUTH_FIX.md
```

### Vercel OAuth Fails

**Checklist:**
- [ ] Redirect URI in Monzo matches Vercel URL exactly
- [ ] All env vars set in Vercel dashboard
- [ ] Completed OAuth flow on PRODUCTION URL (not localhost)
- [ ] Redeployed after setting tokens
- [ ] Using correct Vercel URL (production, not preview)

### "Redirect URI mismatch" Error

**Check:**
1. Monzo portal redirect URI
2. `MONZO_REDIRECT_URI` environment variable
3. No trailing slashes
4. http vs https (Vercel is always https)

### Tokens Don't Refresh

**Check:**
1. `MONZO_REFRESH_TOKEN` is set (not empty)
2. Refresh token is valid (not revoked)
3. Check server logs for refresh errors

---

## Testing Your Setup

### Local Testing

```bash
# Configuration check
curl http://localhost:3000/api/monzo-oauth/diagnose | python3 -m json.tool

# Monzo integration
curl http://localhost:3000/api/monzo-debug | python3 -m json.tool

# Full expenses API
curl "http://localhost:3000/api/expenses?includeMonzo=true&skipCache=true" | python3 -m json.tool

# Open dashboard
open http://localhost:3000
```

### Production Testing

```bash
# Replace with your Vercel URL
PROD_URL="https://expense-dashboard.vercel.app"

# Configuration check
curl "$PROD_URL/api/monzo-oauth/diagnose" | python3 -m json.tool

# Monzo integration
curl "$PROD_URL/api/monzo-debug" | python3 -m json.tool

# Full expenses API
curl "$PROD_URL/api/expenses?includeMonzo=true&skipCache=true" | python3 -m json.tool

# Open dashboard
open "$PROD_URL"
```

---

## Summary: Yes, You Can Configure OAuth for Vercel!

**The Short Answer:**
Your code is already Vercel-ready. You just need to:
1. Configure the Monzo OAuth client with your Vercel URL
2. Set environment variables in Vercel
3. Complete the OAuth flow on your production URL

**No code changes needed!** ✅

---

## Quick Start Commands

### Fix Local OAuth
```bash
./fix-monzo-oauth.sh
```

### Set Up Vercel OAuth
```bash
./setup-vercel-oauth.sh
```

### Read Detailed Guides
```bash
# Local setup
cat MONZO_OAUTH_FIX.md

# Vercel setup
cat VERCEL_OAUTH_SETUP.md

# Quick reference
cat QUICK_START.md
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `OAUTH_COMPLETE_GUIDE.md` | This file - complete overview |
| `QUICK_START.md` | Quick reference for all scenarios |
| `MONZO_OAUTH_FIX.md` | Detailed local OAuth troubleshooting |
| `VERCEL_OAUTH_SETUP.md` | Detailed Vercel production setup |
| `fix-monzo-oauth.sh` | Interactive script for local OAuth |
| `setup-vercel-oauth.sh` | Interactive script for Vercel OAuth |
| `app/api/monzo-oauth/diagnose/route.ts` | Configuration diagnostic endpoint |

---

## Need Help?

1. **Run the appropriate script** (easiest)
2. **Read the detailed guide** for your scenario
3. **Check diagnostic endpoint** for config issues
4. **Visit Monzo Community** for platform-specific issues
5. **Ask me!** I'm here to help 😊

Ready to get started? Pick your path above and let's do this! 🚀
