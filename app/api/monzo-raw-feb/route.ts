import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/monzo-auth';
import { fetchMonzoTransactions } from '@/lib/monzo-client';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to see ALL Feb transactions before filtering
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    const allTxns = await fetchMonzoTransactions(accessToken, 60);
    
    // Get ALL Feb 2026 transactions (no filtering)
    const febTxns = allTxns
      .filter(txn => {
        const date = new Date(txn.created);
        const dateStr = date.toISOString().split('T')[0];
        return dateStr >= '2026-02-01' && dateStr <= '2026-02-28';
      })
      .map(txn => {
        const date = new Date(txn.created);
        const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, etc.
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        
        return {
          date: date.toISOString().split('T')[0],
          day: dayNames[dayOfWeek],
          dayNumber: dayOfWeek,
          merchant: txn.merchant?.name || txn.description,
          amount: Math.abs(txn.amount) / 100,
          isDebit: txn.amount < 0,
          category: txn.category,
          // Filtering checks
          passesDebitCheck: txn.amount < 0,
          passesDayCheck: dayOfWeek >= 1 && dayOfWeek <= 5,
          passesCategoryCheck: ['eating_out', 'groceries', 'coffee', 'shopping', 'general'].includes(txn.category),
          isPotTransfer: (txn.merchant?.name || txn.description || '').toLowerCase().includes('pot_'),
          wouldPassFilter: (
            txn.amount < 0 && 
            dayOfWeek >= 1 && dayOfWeek <= 5 && 
            ['eating_out', 'groceries', 'coffee', 'shopping', 'general'].includes(txn.category) &&
            !(txn.merchant?.name || txn.description || '').toLowerCase().includes('pot_')
          )
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const feb8to14 = febTxns.filter(t => t.date >= '2026-02-08' && t.date <= '2026-02-14');
    const passed = feb8to14.filter(t => t.wouldPassFilter);
    const failed = feb8to14.filter(t => !t.wouldPassFilter);
    
    return NextResponse.json({
      totalFebTransactions: febTxns.length,
      feb8to14Count: feb8to14.length,
      feb8to14Passed: passed.length,
      feb8to14Failed: failed.length,
      feb8to14Transactions: feb8to14,
      failureReasons: failed.map(t => ({
        date: t.date,
        merchant: t.merchant,
        amount: t.amount,
        reasons: [
          !t.passesDebitCheck && 'not_debit',
          !t.passesDayCheck && `wrong_day_${t.day}`,
          !t.passesCategoryCheck && `wrong_category_${t.category}`,
          t.isPotTransfer && 'pot_transfer'
        ].filter(Boolean)
      }))
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
