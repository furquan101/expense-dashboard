# Deployment Guide for Vercel

## Prerequisites

✅ GitHub/GitLab/Bitbucket account
✅ Vercel account (free tier works)
✅ Monzo API access token

## Step-by-Step Deployment

### 1. Push to Git Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Expense dashboard"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/expense-dashboard.git

# Push to main branch
git push -u origin main
```

### 2. Import to Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your repository
4. Vercel will auto-detect Next.js settings

### 3. Configure Environment Variables

**Before deploying**, add environment variables:

1. In Vercel dashboard, go to **Settings → Environment Variables**
2. Add the following variable:

```
Name:  MONZO_ACCESS_TOKEN
Value: eyJhbGc... (your full Monzo token)
```

3. Select environments: **Production**, **Preview**, **Development** (all)
4. Click **Save**

### 4. Deploy

Click **"Deploy"** button.

Vercel will:
- ✅ Install dependencies
- ✅ Run `npm run build`
- ✅ Deploy to production
- ✅ Provide a `.vercel.app` domain

### 5. Custom Domain (Optional)

To add a custom domain:

1. Go to **Settings → Domains**
2. Add your domain
3. Configure DNS records as shown

## Environment Variables Reference

| Variable | Description | Where to get it |
|----------|-------------|----------------|
| `MONZO_ACCESS_TOKEN` | Your Monzo API access token | [developers.monzo.com](https://developers.monzo.com/) |
| `CSV_PATH` | (Optional) Path to historical CSV | Not needed for Vercel deployment |

## Post-Deployment

### Verify Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Check that dashboard loads
3. Click "Sync Monzo" to test API integration
4. Verify expenses display correctly

### Monitor

- View deployment logs in Vercel dashboard
- Check runtime logs for API errors
- Monitor function execution times

### Update Token

When your Monzo token expires:

1. Get new token from [developers.monzo.com](https://developers.monzo.com/)
2. Go to Vercel **Settings → Environment Variables**
3. Edit `MONZO_ACCESS_TOKEN`
4. Enter new value
5. **Redeploy** (Vercel → Deployments → Redeploy)

## Troubleshooting

### Build Fails

Check build logs in Vercel dashboard. Common issues:
- Missing environment variables
- TypeScript errors
- Dependency issues

Solution: Run `npm run build` locally first to catch errors.

### API Returns 401

Issue: Monzo token not configured or expired.

Solution:
1. Verify `MONZO_ACCESS_TOKEN` is set in Vercel
2. Get fresh token from Monzo
3. Update environment variable
4. Redeploy

### No Transactions Showing

Issue: Filtering may be too strict or no transactions in last 14 days.

Solution: Check `/api/monzo/debug` endpoint for diagnostic info.

## Performance Optimization

### Automatic (Already Configured)

- ✅ Edge runtime for fast API responses
- ✅ Static page generation
- ✅ Automatic CDN distribution
- ✅ Image optimization (if using Next.js Image)

### Future Improvements

Consider adding:
- Vercel Postgres for storing historical expenses
- Vercel Cron for scheduled syncs
- Vercel Analytics for usage tracking

## CI/CD

Vercel provides automatic CI/CD:

- **Push to main** → Auto-deploy to production
- **Pull request** → Deploy preview environment
- **Every commit** → Build and test

## Cost

Free tier includes:
- Unlimited deployments
- 100 GB bandwidth/month
- Automatic HTTPS
- 100 GB-hours serverless function execution

This is sufficient for personal expense tracking.

## Security

### Sensitive Data

- ✅ Monzo token stored in Vercel environment variables (encrypted)
- ✅ Not committed to git (`.env.local` in `.gitignore`)
- ✅ API routes run server-side only (tokens never exposed to browser)

### Best Practices

1. Rotate Monzo token regularly
2. Use Vercel's password protection for preview deployments (Settings → Deployment Protection)
3. Enable Vercel Authentication for production if needed

## Monitoring

Monitor your deployment:
- **Vercel Analytics**: Real-time web vitals
- **Runtime Logs**: API errors and warnings
- **Speed Insights**: Core Web Vitals tracking

Enable in: Settings → Analytics

---

Need help? Check [Vercel Documentation](https://vercel.com/docs) or [Next.js Deployment Guide](https://nextjs.org/docs/deployment).
