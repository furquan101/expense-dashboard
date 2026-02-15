import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/monzo-auth';

export const dynamic = 'force-dynamic';

const MONZO_API_BASE = 'https://api.monzo.com';
const ACCOUNT_ID = 'acc_0000AlrlMJPONVy6d8Mbzu';

/**
 * Raw Monzo API diagnostic endpoint
 * Calls Monzo directly and returns full details for debugging
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    // 1. Check account access (whoami)
    const whoamiRes = await fetch(`${MONZO_API_BASE}/ping/whoami`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const whoami = await whoamiRes.json();

    // 2. Try listing accounts
    const accountsRes = await fetch(`${MONZO_API_BASE}/accounts`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const accountsData = await accountsRes.json();

    // 3. Try fetching transactions for last 60 days
    const since = new Date();
    since.setDate(since.getDate() - 60);

    const txnUrl = `${MONZO_API_BASE}/transactions?account_id=${ACCOUNT_ID}&since=${since.toISOString()}&limit=100&expand[]=merchant`;
    const txnRes = await fetch(txnUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    const txnStatus = txnRes.status;
    const txnRaw = await txnRes.text();

    let transactions: unknown[] = [];
    let txnError: string | null = null;
    try {
      const parsed = JSON.parse(txnRaw);
      transactions = parsed.transactions || [];
      if (parsed.error) txnError = JSON.stringify(parsed);
    } catch {
      txnError = txnRaw.slice(0, 500);
    }

    // Summary of first 20 transactions
    const summary = (transactions as Array<{
      created: string;
      merchant?: { name?: string; address?: { postcode?: string; short_formatted?: string } };
      description?: string;
      amount: number;
      category: string;
    }>).slice(0, 20).map(txn => ({
      date: new Date(txn.created).toISOString().split('T')[0],
      merchant: txn.merchant?.name || txn.description,
      amount: `£${Math.abs(txn.amount) / 100}`,
      category: txn.category,
      isDebit: txn.amount < 0,
    }));

    return NextResponse.json({
      whoami,
      accountsStatus: accountsRes.status,
      accounts: accountsData?.accounts?.map((a: { id: string; type: string; closed: boolean }) => ({
        id: a.id,
        type: a.type,
        closed: a.closed,
      })) || [],
      transactionsStatus: txnStatus,
      transactionsError: txnError,
      totalTransactions: transactions.length,
      debitCount: (transactions as Array<{ amount: number }>).filter(t => t.amount < 0).length,
      first20: summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
