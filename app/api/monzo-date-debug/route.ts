import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/monzo-auth';
import { fetchMonzoTransactions } from '@/lib/monzo-client';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check date ranges and what Monzo is actually returning
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    
    // Calculate what date range we're requesting
    const now = new Date();
    const since = new Date();
    since.setDate(since.getDate() - 60);
    
    const allTxns = await fetchMonzoTransactions(accessToken, 60);
    
    // Get date range of actual transactions
    const dates = allTxns.map(txn => new Date(txn.created).toISOString().split('T')[0]).sort();
    const oldestDate = dates[0];
    const newestDate = dates[dates.length - 1];
    
    // Count by month
    const byMonth: Record<string, number> = {};
    dates.forEach(date => {
      const month = date.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });
    
    // Get a sample of the most recent transactions
    const recentSample = allTxns
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 10)
      .map(txn => ({
        created: txn.created,
        date: new Date(txn.created).toISOString().split('T')[0],
        merchant: txn.merchant?.name || txn.description,
        amount: Math.abs(txn.amount) / 100,
        category: txn.category
      }));
    
    return NextResponse.json({
      currentServerTime: now.toISOString(),
      requestedSinceDate: since.toISOString(),
      requestedDaysBack: 60,
      totalTransactionsReturned: allTxns.length,
      actualDateRange: {
        oldest: oldestDate,
        newest: newestDate
      },
      transactionsByMonth: byMonth,
      recentSample,
      hasFebTransactions: Object.keys(byMonth).some(m => m.startsWith('2026-02'))
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
