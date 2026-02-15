# Demo Mode - Social Media Ready

## Overview

A demonstration mode with realistic dummy data perfect for social media showcases, screenshots, and presentations.

## Access the Demo

Once deployed, access the demo at:

```
https://your-domain.com/demo
```

Or locally:

```
http://localhost:3000/demo
```

## Features

The demo includes:

- **25 Work Lunch Transactions**: Realistic lunch expenses from popular London restaurants over 6 weeks
- **20 Business Trip Expenses**: Complete 5-day Manchester business trip with hotel, meals, and travel costs
- **Animated Statistics**: Eye-catching number animations
- **Real-time UI**: Responsive design that looks great on all devices
- **Bank Connection Status**: Shows as "connected" for realistic appearance

## Demo Data Details

### Work Lunches (£312+)
- 25 transactions from popular chains (Pret A Manger, Leon, Wasabi, Tortilla, Dishoom, etc.)
- Weekdays only (Mon-Fri)
- Various London locations (Shoreditch, Old Street, Liverpool Street, etc.)
- Price range: £4.75 - £26.75

### Business Trip (£615+)
- 5-day Manchester conference/business trip
- Hotel accommodation (£189)
- All meals, coffee breaks, and client dinners
- Transportation (Uber, taxis)
- Office supplies and incidentals

### Total Demo Expenses
- **45 transactions**
- **£927+ total**
- **Fully categorized and timestamped**

## What Makes This Demo Ready

1. **No Authentication Required**: Anyone can view the demo without setup
2. **Consistent Data**: Same realistic data on every load
3. **Clean UI**: Professional dark theme design
4. **Clear Demo Banner**: Visible indicator that it's demo mode
5. **Mobile Responsive**: Looks great in screenshots at any size

## Perfect For

- Social media posts (Twitter, LinkedIn, Instagram)
- Portfolio showcases
- Investor presentations
- Product demonstrations
- Screenshot galleries
- Video walkthroughs

## Screenshot Tips

For best social media results:

1. **Desktop View**: Capture at 1920x1080 for Twitter/LinkedIn
2. **Mobile View**: Use DevTools mobile view for Instagram Stories
3. **Focus Areas**:
   - Animated statistics cards (capture during animation)
   - Accordion sections (expanded view)
   - Connection status indicator (green dot)
   - Demo banner (shows it's a demo, not real data)

## Technical Details

- **API Endpoint**: `/api/demo-expenses`
- **Page Component**: `/app/demo/page.tsx`
- **Data Generation**: Server-side, no external dependencies
- **Build Status**: Fully static, pre-rendered

## Privacy & Compliance

All data is completely fictional:
- No real merchants or businesses
- Generic London/Manchester locations
- Amounts are randomized
- No actual bank connections
- Clearly labeled as demo mode

## Need Help?

The demo page is self-contained and requires no configuration. If you encounter any issues, check that:

1. The app builds successfully: `npm run build`
2. The server is running: `npm run dev` or `npm start`
3. You're accessing the correct URL: `/demo`

---

**Built by Furquan Ahmad**
