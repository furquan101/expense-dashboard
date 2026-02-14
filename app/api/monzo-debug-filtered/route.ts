import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/monzo-auth';
import { fetchMonzoTransactions, isLunchExpense, convertToExpense } from '@/lib/monzo-client';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to see what transactions are passing the lunch filter
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    const allTxns = await fetchMonzoTransactions(accessToken, 60);
    
    // Get all transactions that pass the lunch filter
    const lunchTxns = allTxns.filter(isLunchExpense);
    const expenses = lunchTxns.map(convertToExpense);
    
    // Group by month for analysis
    const byMonth: Record<string, any[]> = {};
    expenses.forEach(e => {
      const month = e.date.substring(0, 7); // YYYY-MM
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push({
        date: e.date,
        day: e.day,
        merchant: e.merchant,
        amount: e.amount,
        category: e.category
      });
    });
    
    // Calculate monthly totals
    const monthlySummary = Object.keys(byMonth).sort().map(month => ({
      month,
      count: byMonth[month].length,
      total: byMonth[month].reduce((sum, e) => sum + e.amount, 0).toFixed(2),
      transactions: byMonth[month]
    }));
    
    return NextResponse.json({
      totalTransactions: allTxns.length,
      passedLunchFilter: lunchTxns.length,
      filterPassRate: `${((lunchTxns.length / allTxns.length) * 100).toFixed(1)}%`,
      monthlySummary,
      februaryOnly: byMonth['2026-02'] || []
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
