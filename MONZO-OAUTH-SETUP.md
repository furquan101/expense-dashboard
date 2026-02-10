# Monzo OAuth Setup Guide

## Why Auto-Refresh Tokens?

Monzo access tokens expire every ~5 hours. Instead of manually refreshing them, we use **OAuth2 refresh tokens** to automatically get new access tokens when they expire.

**Benefits:**
- ✅ No manual token updates needed
- ✅ Tokens auto-refresh in the background
- ✅ One-time setup process
- ✅ Seamless experience

---

## Setup Steps

### Step 1: Create Monzo OAuth Client

1. Go to [Monzo Developer Portal](https://developers.monzo.com/)
2. Log in with your Monzo account
3. Click **"Create OAuth Client"** or **"New Client"**
4. Fill in the details:
   - **Name**: `Expense Dashboard` (or any name)
   - **Logo URL**: (optional)
   - **Redirect URI**: `http://localhost:3000/api/monzo-oauth/callback`
   - **Confidentiality**: Select **Confidential**
   - **Description**: Personal expense tracking

5. Click **"Create"** or **"Submit"**
6. Copy your **Client ID** and **Client Secret**

---

### Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Monzo OAuth Credentials
MONZO_CLIENT_ID=your_client_id_here
MONZO_CLIENT_SECRET=your_client_secret_here
MONZO_REDIRECT_URI=http://localhost:3000/api/monzo-oauth/callback

# These will be filled after authorization (Step 3)
# MONZO_ACCESS_TOKEN=
# MONZO_REFRESH_TOKEN=
```

---

### Step 3: Authorize Your Account

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Visit the setup endpoint**:
   ```
   http://localhost:3000/api/monzo-oauth/setup
   ```

3. **Copy the authorization URL** from the response

4. **Visit that URL** in your browser
   - You'll be redirected to Monzo
   - Log in and authorize the app
   - You'll be redirected back to your app

5. **Copy the tokens** from the callback response:
   ```json
   {
     "MONZO_ACCESS_TOKEN": "your_access_token",
     "MONZO_REFRESH_TOKEN": "your_refresh_token"
   }
   ```

6. **Add them to `.env.local`**:
   ```bash
   MONZO_ACCESS_TOKEN=your_access_token_here
   MONZO_REFRESH_TOKEN=your_refresh_token_here
   ```

7. **Restart your dev server**:
   ```bash
   npm run dev
   ```

---

## How Auto-Refresh Works

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  API Request  →  Check Token  →  Expired?  →  Yes  →  Refresh  │
│                       ↓                            ↓         │
│                      No                    Use New Token   │
│                       ↓                            ↓         │
│                  Use Existing  ←──────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. **Every API request** checks if the access token is expired
2. **If expired** (or expiring in < 5 minutes):
   - Automatically calls Monzo OAuth to get a new access token
   - Uses the refresh token (which lasts much longer)
   - Updates the in-memory token cache
3. **If valid**: Uses the existing access token
4. **Seamless**: You never have to manually refresh tokens!

---

## Testing

After setup, test that auto-refresh works:

```bash
# Visit the debug endpoint
curl http://localhost:3000/api/monzo-debug

# Should show recent transactions
# If token was expired, you'll see "Refreshing Monzo access token..." in console
```

---

## Production Deployment (Vercel)

For production, you need:

1. **Update redirect URI** in Monzo Developer Portal:
   ```
   https://your-domain.vercel.app/api/monzo-oauth/callback
   ```

2. **Set environment variables** in Vercel:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `MONZO_CLIENT_ID`
     - `MONZO_CLIENT_SECRET`
     - `MONZO_REDIRECT_URI` (production URL)
     - `MONZO_ACCESS_TOKEN` (get from setup)
     - `MONZO_REFRESH_TOKEN` (get from setup)

3. **Re-authorize** using production URL:
   - Visit `https://your-domain.vercel.app/api/monzo-oauth/setup`
   - Follow the same authorization flow
   - Update Vercel env vars with new tokens

---

## Troubleshooting

### "OAuth not configured" error

**Solution**: Make sure all environment variables are set in `.env.local`:
```bash
MONZO_CLIENT_ID=...
MONZO_CLIENT_SECRET=...
MONZO_REDIRECT_URI=http://localhost:3000/api/monzo-oauth/callback
```

### "Failed to refresh token" error

**Causes:**
1. Refresh token expired (happens after ~90 days)
2. Invalid client credentials
3. User revoked access in Monzo app

**Solution**: Re-authorize by visiting `/api/monzo-oauth/setup` again

### No transactions appearing

**Causes:**
1. No recent transactions matching filters (Mon-Thu, Kings Cross, eating_out/groceries)
2. Token refresh failing silently

**Debug:**
```bash
# Check debug endpoint
curl http://localhost:3000/api/monzo-debug

# Check server logs for refresh attempts
npm run dev
# Look for "Refreshing Monzo access token..." messages
```

---

## Token Lifespan

| Token Type | Lifespan | Auto-Refresh |
|------------|----------|--------------|
| Access Token | ~5 hours | ✅ Yes |
| Refresh Token | ~90 days | ❌ Re-authorize needed |

After 90 days, you'll need to re-authorize via `/api/monzo-oauth/setup`.

---

## Security Notes

- ✅ **Never commit** `.env.local` to git (already in `.gitignore`)
- ✅ **Keep refresh tokens secret** - they have long-term access
- ✅ **Use HTTPS in production** for redirect URIs
- ✅ **Revoke access** in Monzo app if you suspect compromise

---

## Quick Reference

| Endpoint | Purpose |
|----------|---------|
| `/api/monzo-oauth/setup` | Get authorization URL |
| `/api/monzo-oauth/callback` | OAuth callback (handles tokens) |
| `/api/expenses` | Main expenses API (auto-refreshes) |
| `/api/monzo-debug` | Debug Monzo transactions (auto-refreshes) |

---

## Need Help?

1. Check server console logs for token refresh messages
2. Visit `/api/monzo-oauth/setup` to see configuration status
3. Test with `/api/monzo-debug` to see what transactions are being fetched
4. Check [Monzo API docs](https://docs.monzo.com/) for latest OAuth info
