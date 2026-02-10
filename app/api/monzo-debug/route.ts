import { NextResponse } from 'next/server';
import { fetchMonzoTransactions, isLunchExpense } from '@/lib/monzo-client';
import { getValidAccessToken } from '@/lib/monzo-auth';
import type { MonzoTransaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface DebugResult {
  transaction: {
    date: string;
    merchant: string;
    amount: number;
    category: string;
    postcode: string;
    location: string;
  };
  filters: {
    isDebit: boolean;
    isPotTransfer: boolean;
    hasKingsXPostcode: boolean;
    hasKingsXKeyword: boolean;
    isKingsX: boolean;
    isExcluded: boolean;
    dayOfWeek: number;
    isWorkDay: boolean;
    isFoodCategory: boolean;
    passedFilter: boolean;
  };
}

function debugTransaction(txn: MonzoTransaction): DebugResult {
  const merchantName = txn.merchant?.name || txn.description || '';
  const postcode = txn.merchant?.address?.postcode || '';
  const city = txn.merchant?.address?.city || '';
  const shortFormatted = txn.merchant?.address?.short_formatted || '';
  const fullLocation = `${merchantName} ${shortFormatted} ${postcode} ${city}`.toLowerCase();

  const kingsXPostcodes = ['n1c', 'wc1x', 'wc1h'];
  const kingsXKeywords = ['kings cross', 'pancras', 'st pancras'];
  const hasKingsXPostcode = kingsXPostcodes.some(pc => postcode.toLowerCase().includes(pc));
  const hasKingsXKeyword = kingsXKeywords.some(kw => fullLocation.includes(kw));
  const isKingsX = hasKingsXPostcode || hasKingsXKeyword;

  const excludeAreas = ['basildon', 'ss15', 'e1 1', 'e1d', 'sw1', 'victoria', 'wc1b', 'wc2', 'shoreditch', 'whitechapel', 'southampton row'];
  const isExcluded = excludeAreas.some(area => fullLocation.includes(area));

  const date = new Date(txn.created);
  const day = date.getDay();
  const isWorkDay = day >= 1 && day <= 4;
  const isFoodCategory = ['eating_out', 'groceries'].includes(txn.category);

  return {
    transaction: {
      date: txn.created,
      merchant: merchantName,
      amount: txn.amount / 100,
      category: txn.category,
      postcode: postcode,
      location: fullLocation,
    },
    filters: {
      isDebit: txn.amount < 0,
      isPotTransfer: merchantName.toLowerCase().includes('pot_'),
      hasKingsXPostcode,
      hasKingsXKeyword,
      isKingsX,
      isExcluded,
      dayOfWeek: day,
      isWorkDay,
      isFoodCategory,
      passedFilter: isLunchExpense(txn),
    },
  };
}

export async function GET() {
  try {
    // Get valid access token (will auto-refresh if expired)
    const accessToken = await getValidAccessToken();

    // Fetch last 7 days for debugging
    const transactions = await fetchMonzoTransactions(accessToken, 7);

    const debugResults = transactions
      .map(debugTransaction)
      .sort((a, b) => new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime());

    const passed = debugResults.filter(r => r.filters.passedFilter);
    const failed = debugResults.filter(r => !r.filters.passedFilter);

    // Analyze why transactions failed
    const failureReasons: Record<string, number> = {};
    failed.forEach(r => {
      if (!r.filters.isDebit) failureReasons['Not a debit'] = (failureReasons['Not a debit'] || 0) + 1;
      if (r.filters.isPotTransfer) failureReasons['Pot transfer'] = (failureReasons['Pot transfer'] || 0) + 1;
      if (!r.filters.isKingsX) failureReasons['Not Kings Cross'] = (failureReasons['Not Kings Cross'] || 0) + 1;
      if (r.filters.isExcluded) failureReasons['Excluded area'] = (failureReasons['Excluded area'] || 0) + 1;
      if (!r.filters.isWorkDay) failureReasons['Not Mon-Thu'] = (failureReasons['Not Mon-Thu'] || 0) + 1;
      if (!r.filters.isFoodCategory) failureReasons['Not food category'] = (failureReasons['Not food category'] || 0) + 1;
    });

    return NextResponse.json({
      summary: {
        totalFetched: transactions.length,
        passed: passed.length,
        failed: failed.length,
        failureReasons,
      },
      recentTransactions: debugResults.slice(0, 20), // Last 20 transactions
      todayTransactions: debugResults.filter(r => {
        const txnDate = new Date(r.transaction.date);
        const today = new Date();
        return txnDate.toDateString() === today.toDateString();
      }),
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
      );
  }
}
