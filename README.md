# Expense Dashboard

Real-time expense tracking dashboard with Monzo API integration.

## Features

- ✅ Real-time expense tracking with Monzo API
- ✅ Auto-refreshes every 5 minutes
- ✅ Smart filtering for Kings Cross office lunches (Mon-Thu only)
- ✅ Business trip expense tracking
- ✅ Clean YouTube-inspired dark theme
- ✅ Animated number counters & loading states
- ✅ Fully responsive design
- ✅ Keyboard navigation support
- ✅ Built with Next.js 16 + shadcn/ui

## Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with Radix UI
- **Font**: Inter from Google Fonts
- **API**: Monzo API for transaction sync
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+
- Monzo API access token (get from [Monzo Developer Portal](https://developers.monzo.com/))

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Add your Monzo access token to `.env.local`:
```
MONZO_ACCESS_TOKEN=your_token_here
```

4. (Optional) Add path to CSV file with historical expenses:
```
CSV_PATH=/path/to/your/coupa_expenses.csv
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Quick Deploy

1. Push your code to GitHub/GitLab/Bitbucket

2. Import your repository in [Vercel](https://vercel.com/new)

3. Add environment variable in Vercel dashboard:
   - **Name**: `MONZO_ACCESS_TOKEN`
   - **Value**: Your Monzo API token from developers.monzo.com

4. Deploy! 🚀

### Environment Variables

Configure these in Vercel dashboard (Settings → Environment Variables):

| Variable | Description | Required |
|----------|-------------|----------|
| `MONZO_ACCESS_TOKEN` | Monzo API access token | ✅ Yes |
| `CSV_PATH` | Path to CSV with historical expenses | ❌ No |

**Note**: CSV file is optional. On Vercel, the dashboard will use Monzo API data only.

## How It Works

### Work Lunches Tracking

Automatically filters Monzo transactions for office lunches:
- **Days**: Mon-Thu only (work days)
- **Location**: Kings Cross area (N1C, WC1X, WC1H postcodes)
- **Category**: Food/eating out only
- **Exclusions**: Non-office areas (Basildon, East London, Victoria, etc.)

### Live Sync

- Auto-refreshes every 5 minutes in background
- Manual "Sync Monzo" button for instant updates
- Progress bar shows sync status
- Animated number counters for stats

### Data Sources

1. **Monzo API**: Last 14 days of transactions (live data)
2. **CSV File** (optional): Historical expenses from local file

## API Routes

- `GET /api/expenses` - Main expenses endpoint (CSV + Monzo)
- `GET /api/monzo` - Monzo transactions only
- `GET /api/monzo/test-filter` - Debug endpoint for testing filters

## Development

### Running Tests

```bash
# Run Playwright E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test dashboard.spec.ts
```

### Build for Production

```bash
npm run build
npm start
```

## Architecture

```
expense-dashboard/
├── app/
│   ├── api/
│   │   ├── expenses/route.ts          # Main expenses API
│   │   └── monzo/
│   │       ├── route.ts               # Monzo transactions API
│   │       └── test-filter/route.ts   # Debug endpoint
│   ├── page.tsx                        # Dashboard component
│   ├── layout.tsx                      # Root layout
│   └── globals.css                     # Design system
├── components/ui/                      # shadcn/ui components
├── tests/                              # E2E tests
└── .env.example                        # Environment variables template
```

## Design System

### Colors (YouTube Dark Theme)
- Background: `#0f0f0f`
- Cards: `#212121`
- Borders: `#3f3f3f`
- Text: `#f1f1f1`
- Muted: `#aaaaaa`

### Typography
- Font: Inter (Google Fonts)
- Fluid scale with CSS custom properties
- Tabular numbers for amounts

### Spacing
- Consistent spacing scale: `--space-xs` to `--space-3xl`
- Fluid spacing with `clamp()`

### Animations
- Number count-up on load
- Staggered table row reveals
- Smooth accordion transitions
- Loading skeleton (not spinner)

## License

MIT
