# Monzo OAuth Fix Guide - Long-Term Solution

## Problem Analysis

The error "We couldn't identify who you'd like to connect your account with" indicates an OAuth client configuration issue in the Monzo Developer Portal, not a code problem.

## Root Causes (Based on Research)

1. **OAuth Client Status**: Client might not be properly activated or in "Live" state
2. **Client Association**: Client may not be associated with your personal Monzo account
3. **Client Type Mismatch**: Needs to be "Confidential" client for refresh tokens
4. **Portal Bugs**: Monzo developer portal has known issues with OAuth client visibility

## Complete Fix Process

### Step 1: Verify Current OAuth Client

1. Visit https://developers.monzo.com/
2. Log in with your Monzo account
3. Navigate to "OAuth Clients" or "Clients" section
4. Look for client ID: `oauth2client_0000B3CyjIzkgMzbGQaZkK`

**Check these settings:**
- [ ] Client status is "Live" (not "Test" or "Pending")
- [ ] Redirect URI is EXACTLY: `http://localhost:3000/api/monzo-oauth/callback`
- [ ] Client type is "Confidential" (required for refresh tokens)
- [ ] Client is visible and accessible in the portal

### Step 2: Delete and Recreate OAuth Client (If Issues Found)

If the client has issues or is not visible:

1. **Delete existing client** (if accessible)
2. **Create new OAuth client** with these exact settings:
   - **Name**: Expense Dashboard (or your preferred name)
   - **Redirect URI**: `http://localhost:3000/api/monzo-oauth/callback`
   - **Confidentiality**: "Confidential" (to get refresh tokens)
   - **Description**: Personal expense tracking dashboard

3. **Save the credentials**:
   - Copy the `Client ID` (starts with `oauth2client_`)
   - Copy the `Client Secret` (starts with `mnzconf.`)
   - Keep these secure!

### Step 3: Update .env.local

Replace your current credentials in `.env.local`:

```bash
# Monzo OAuth Credentials
MONZO_CLIENT_ID=<your_new_client_id>
MONZO_CLIENT_SECRET=<your_new_client_secret>
MONZO_REDIRECT_URI=http://localhost:3000/api/monzo-oauth/callback

# These will be filled after authorization
MONZO_ACCESS_TOKEN=
MONZO_REFRESH_TOKEN=
```

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C in terminal)
cd /Users/furquan.ahmad/expense-dashboard
npm run dev
```

### Step 5: Complete OAuth Authorization Flow

1. **Get authorization URL**:
   ```bash
   curl http://localhost:3000/api/monzo-oauth/setup | python3 -m json.tool
   ```

2. **Copy the `authorizationUrl`** from the response

3. **Open URL in browser** - This starts the OAuth flow

4. **Two-Factor Authentication**:
   - You'll receive an email from Monzo - click the link
   - Open your Monzo app on your phone
   - You'll get a notification asking to authorize
   - **Confirm with PIN/Fingerprint/Face ID**

5. **Grant permissions** in the Monzo app when prompted

6. **You'll be redirected** back to `http://localhost:3000/api/monzo-oauth/callback`

7. **Copy the tokens** from the JSON response:
   - `MONZO_ACCESS_TOKEN`
   - `MONZO_REFRESH_TOKEN`

8. **Update .env.local** with both tokens

9. **Restart dev server** again

### Step 6: Verify It Works

```bash
# Test 1: Check authentication
curl http://localhost:3000/api/monzo-debug | python3 -m json.tool

# Test 2: Check expenses API
curl "http://localhost:3000/api/expenses?includeMonzo=true&skipCache=true" | python3 -m json.tool

# Test 3: Open dashboard
open http://localhost:3000
```

## Understanding the Monzo OAuth Flow

```
┌─────────┐                                   ┌──────────┐
│ Your App│                                   │  Monzo   │
└────┬────┘                                   └────┬─────┘
     │                                             │
     │  1. Redirect to authorization URL           │
     ├────────────────────────────────────────────>│
     │                                             │
     │  2. User receives email                     │
     │     & Monzo app notification                │
     │                                             │
     │  3. User authorizes in app (PIN/Face ID)    │
     │                                             │
     │  4. Callback with code                      │
     │<────────────────────────────────────────────┤
     │                                             │
     │  5. Exchange code for tokens                │
     ├────────────────────────────────────────────>│
     │                                             │
     │  6. Receive access_token & refresh_token    │
     │<────────────────────────────────────────────┤
     │                                             │
     │  7. Make API calls with access_token        │
     ├────────────────────────────────────────────>│
     │                                             │
     │  8. Auto-refresh when expired (every ~5h)   │
     │<───────────────────────────────────────────>│
```

## Common Issues & Solutions

### Issue: "We couldn't identify who you'd like to connect"
**Solution**: OAuth client not properly set up. Delete and recreate client in Monzo portal.

### Issue: OAuth client not visible in portal
**Solution**: Known Monzo portal bug. Try logging out and back in, or use different browser.

### Issue: No refresh token received
**Solution**: Client must be "Confidential" type. Recreate client with correct type.

### Issue: Token expires and won't refresh
**Solution**: Check that `MONZO_REFRESH_TOKEN` is set in `.env.local`. The code auto-refreshes if present.

### Issue: "forbidden" when accessing transactions
**Solution**: Need to approve permissions in Monzo app after getting access token.

## Advantages of Proper OAuth Setup

Once working, you get:
- ✅ Automatic token refresh (every ~5 hours)
- ✅ No manual intervention needed
- ✅ Production-ready authentication
- ✅ Secure token management
- ✅ Long-term solution

## Quick Test Commands

```bash
# Run diagnostics
curl http://localhost:3000/api/monzo-oauth/diagnose | python3 -m json.tool

# Get setup URL
curl http://localhost:3000/api/monzo-oauth/setup | python3 -m json.tool

# Test Monzo integration
curl http://localhost:3000/api/monzo-debug | python3 -m json.tool

# Full expenses test
curl "http://localhost:3000/api/expenses?includeMonzo=true&skipCache=true" | python3 -m json.tool
```

## References

- [Monzo OAuth Documentation](https://github.com/monzo/docs/blob/master/source/includes/_authentication.md)
- [Monzo Developers Portal](https://developers.monzo.com/)
- [Monzo Community - Authentication Issues](https://community.monzo.com/t/authentication-broken/155011)

## Next Steps

After completing this guide, if OAuth still doesn't work:
1. Contact Monzo Developer Support
2. Check Monzo Community forums for recent similar issues
3. Consider using API Playground token as temporary fallback (expires in 5 hours)
