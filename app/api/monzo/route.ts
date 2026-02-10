import { NextResponse } from 'next/server';

interface MonzoTransaction {
  id: string;
  created: string;
  description: string;
  amount: number;
  merchant?: {
    name?: string;
    address?: {
      city?: string;
      short_formatted?: string;
      postcode?: string;
    };
  };
  category: string;
}

async function fetchMonzoTransactions(accessToken: string, since: Date) {
  const allTransactions: MonzoTransaction[] = [];
  let before = '';

  // Fetch in batches to handle pagination (Monzo limits to ~30 per request)
  // Using 14-day windows to avoid verification_required errors
  const maxIterations = 5;
  let iteration = 0;

  while (iteration < maxIterations) {
    const url = before
      ? `https://api.monzo.com/transactions?account_id=acc_0000AlrlMJPONVy6d8Mbzu&since=${since.toISOString()}&before=${before}&limit=100&expand[]=merchant`
      : `https://api.monzo.com/transactions?account_id=acc_0000AlrlMJPONVy6d8Mbzu&since=${since.toISOString()}&limit=100&expand[]=merchant`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Monzo API error:', response.status, errorText);
      break; // Stop pagination on error
    }

    const data = await response.json();
    const transactions = data.transactions as MonzoTransaction[];

    if (!transactions || transactions.length === 0) {
      break; // No more transactions
    }

    allTransactions.push(...transactions);

    // If we got less than limit, we've reached the end
    if (transactions.length < 100) {
      break;
    }

    // Set before parameter to the oldest transaction ID for next batch
    before = transactions[transactions.length - 1].created;
    iteration++;
  }

  return allTransactions;
}

function isLunchExpense(txn: MonzoTransaction): boolean {
  // Only debits
  if (txn.amount >= 0) return false;

  const merchant = txn.merchant;
  const merchantName = merchant?.name || txn.description || '';

  // Skip pot transfers
  if (merchantName.toLowerCase().includes('pot_')) return false;

  const shortFormatted = merchant?.address?.short_formatted || '';
  const postcode = merchant?.address?.postcode || '';
  const city = merchant?.address?.city || '';

  const fullLocation = `${merchantName} ${shortFormatted} ${postcode} ${city}`.toLowerCase();

  // Kings Cross postcodes and keywords
  const kingsXPostcodes = ['n1c', 'wc1x', 'wc1h'];
  const kingsXKeywords = ['kings cross', 'pancras', 'st pancras'];

  const hasKingsXPostcode = kingsXPostcodes.some(pc => postcode.toLowerCase().includes(pc));
  const hasKingsXKeyword = kingsXKeywords.some(kw => fullLocation.includes(kw));
  const isKingsX = hasKingsXPostcode || hasKingsXKeyword;

  // Exclude areas that are definitely NOT Kings Cross
  const excludeAreas = ['basildon', 'ss15', 'e1 1', 'e1d', 'sw1', 'victoria', 'wc1b', 'wc2', 'shoreditch', 'whitechapel', 'southampton row'];
  const isExcluded = excludeAreas.some(area => fullLocation.includes(area));

  // Check day of week (Mon-Thu for office lunches)
  const date = new Date(txn.created);
  const day = date.getDay();
  const isWorkDay = day >= 1 && day <= 4; // Mon-Thu

  // Food categories only
  const isFoodCategory = ['eating_out'].includes(txn.category);

  return isWorkDay && isKingsX && isFoodCategory && !isExcluded;
}

export async function GET() {
  try {
    // Use environment variable for Vercel deployment
    const accessToken = process.env.MONZO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ error: 'No Monzo token configured' }, { status: 401 });
    }

    // Fetch last 14 days of transactions (to avoid verification_required)
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const transactions = await fetchMonzoTransactions(accessToken, since);

    // Filter for lunch expenses
    const lunchExpenses = transactions
      .filter(isLunchExpense)
      .map(txn => ({
        id: txn.id,
        date: new Date(txn.created).toISOString().split('T')[0],
        merchant: txn.merchant?.name || txn.description,
        amount: Math.abs(txn.amount) / 100,
        location: txn.merchant?.address?.city || '',
        category: txn.category,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const total = lunchExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return NextResponse.json({
      expenses: lunchExpenses,
      total,
      count: lunchExpenses.length,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching Monzo data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Monzo data' },
      { status: 500 }
    );
  }
}
