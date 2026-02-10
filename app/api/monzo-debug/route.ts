import { NextResponse } from 'next/server';

interface MonzoTransaction {
  amount: number;
  created: string;
  description: string;
  merchant?: {
    name?: string;
    address?: {
      city?: string;
      short_formatted?: string;
      postcode?: string;
    }
  };
  category: string;
}

function isLunchExpense(txn: MonzoTransaction) {
  if (txn.amount >= 0) return { pass: false, reason: 'Not a debit' };

  const merchantName = txn.merchant?.name || txn.description || '';
  if (merchantName.toLowerCase().includes('pot_')) {
    return { pass: false, reason: 'Pot transfer' };
  }

  const postcode = txn.merchant?.address?.postcode || '';
  const city = txn.merchant?.address?.city || '';
  const shortFormatted = txn.merchant?.address?.short_formatted || '';
  const fullLocation = `${merchantName} ${shortFormatted} ${postcode} ${city}`.toLowerCase();

  const kingsXPostcodes = ['n1c', 'wc1x', 'wc1h'];
  const kingsXKeywords = ['kings cross', 'pancras', 'st pancras'];
  const hasKingsXPostcode = kingsXPostcodes.some(pc => postcode.toLowerCase().includes(pc));
  const hasKingsXKeyword = kingsXKeywords.some(kw => fullLocation.includes(kw));
  const isKingsX = hasKingsXPostcode || hasKingsXKeyword;

  if (!isKingsX) {
    return { pass: false, reason: `Not Kings Cross (postcode: ${postcode})` };
  }

  const excludeAreas = ['basildon', 'ss15', 'e1 1', 'e1d', 'sw1', 'victoria', 'wc1b', 'wc2', 'shoreditch', 'whitechapel', 'southampton row'];
  const isExcluded = excludeAreas.some(area => fullLocation.includes(area));
  if (isExcluded) {
    return { pass: false, reason: 'Excluded area' };
  }

  const date = new Date(txn.created);
  const day = date.getDay();
  const isWorkDay = day >= 1 && day <= 4;
  if (!isWorkDay) {
    return { pass: false, reason: `Not Mon-Thu (day: ${day})` };
  }

  const isFoodCategory = ['eating_out'].includes(txn.category);
  if (!isFoodCategory) {
    return { pass: false, reason: `Not eating_out (category: ${txn.category})` };
  }

  return { pass: true, reason: 'All filters passed' };
}

export async function GET() {
  try {
    const accessToken = process.env.MONZO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ error: 'No token' });
    }

    // Use relative date (90 days) instead of absolute date
    const since = new Date();
    since.setDate(since.getDate() - 90);

    // Fetch with pagination like the main endpoint
    const allTransactions: MonzoTransaction[] = [];
    let before = '';
    const maxIterations = 10;
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

      if (!response.ok) break;

      const data = await response.json();
      const transactions = data.transactions || [];

      if (transactions.length === 0) break;

      allTransactions.push(...transactions);

      if (transactions.length < 100) break;

      before = transactions[transactions.length - 1].created;
      iteration++;
    }

    const transactions = allTransactions;

    const filtered = transactions.map((txn: MonzoTransaction) => ({
      date: txn.created.split('T')[0],
      merchant: txn.merchant?.name || txn.description,
      amount: Math.abs(txn.amount) / 100,
      category: txn.category,
      postcode: txn.merchant?.address?.postcode || '',
      filter: isLunchExpense(txn),
    }));

    const passing = filtered.filter((t: { filter: { pass: boolean }}) => t.filter.pass);
    const dec16Transactions = filtered.filter((t: { date: string }) => t.date === '2025-12-16');

    const dates = filtered.map((t: { date: string }) => t.date);
    const uniqueDates = [...new Set(dates)].sort();

    return NextResponse.json({
      sinceDate: since.toISOString(),
      totalTransactions: transactions.length,
      passingFilters: passing.length,
      dateRange: {
        earliest: uniqueDates[uniqueDates.length - 1],
        latest: uniqueDates[0],
        uniqueDates: uniqueDates.length,
        allDates: uniqueDates,
      },
      samplePassing: passing.slice(0, 10),
      sampleFailing: filtered.filter((t: { filter: { pass: boolean }}) => !t.filter.pass).slice(0, 10),
      dec16Count: dec16Transactions.length,
      dec16Transactions: dec16Transactions,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed',
      details: error instanceof Error ? error.message : 'Unknown',
    });
  }
}
