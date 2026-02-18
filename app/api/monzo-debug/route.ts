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
    isInLondon: boolean;
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
  const region = txn.merchant?.address?.region || '';
  const shortFormatted = txn.merchant?.address?.short_formatted || '';
  const fullLocation = `${merchantName} ${shortFormatted} ${postcode} ${city} ${region}`.toLowerCase();

  // Mirrors isInLondon() from monzo-client.ts
  const londonCityNames = ['london', 'city of london', 'greater london'];
  const matchesCityName = londonCityNames.some(name => city.toLowerCase().includes(name) || region.toLowerCase().includes(name));
  const londonPostcodePattern = /^(EC|WC|E|N|NW|SE|SW|W)\d+[A-Z]?\s*\d[A-Z]{2}$/i;
  const matchesPostcode = !!postcode && londonPostcodePattern.test(postcode);
  // No address = assumed local (same logic as isInLondon)
  const isInLondon = !city && !region && !postcode ? true : matchesCityName || matchesPostcode;

  const date = new Date(txn.created);
  const day = date.getDay();
  const isWorkDay = day >= 1 && day <= 5; // Mon-Fri, matches isLunchExpense()
  const isFoodCategory = ['eating_out', 'groceries', 'coffee', 'shopping', 'general'].includes(txn.category);

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
      isInLondon,
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
      if (!r.filters.isInLondon) failureReasons['Not in London'] = (failureReasons['Not in London'] || 0) + 1;
      if (!r.filters.isWorkDay) failureReasons['Not a workday (Mon-Fri)'] = (failureReasons['Not a workday (Mon-Fri)'] || 0) + 1;
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
