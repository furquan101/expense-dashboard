import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use environment variable for Vercel deployment
    const accessToken = process.env.MONZO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ error: 'No Monzo token configured' }, { status: 401 });
    }

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      token_prefix: accessToken.substring(0, 20) + '...',
      token_length: accessToken.length,
    };

    // Test 1: Ping/whoami to check if token is valid
    try {
      const whoamiResponse = await fetch('https://api.monzo.com/ping/whoami', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      debugInfo.whoami_status = whoamiResponse.status;
      debugInfo.whoami_ok = whoamiResponse.ok;
      if (whoamiResponse.ok) {
        debugInfo.whoami_data = await whoamiResponse.json();
      } else {
        debugInfo.whoami_error = await whoamiResponse.text();
      }
    } catch (e) {
      debugInfo.whoami_error = e instanceof Error ? e.message : 'Unknown error';
    }

    // Test 2: List accounts
    try {
      const accountsResponse = await fetch('https://api.monzo.com/accounts', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      debugInfo.accounts_status = accountsResponse.status;
      debugInfo.accounts_ok = accountsResponse.ok;
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        debugInfo.accounts_data = accountsData;
        debugInfo.account_count = accountsData.accounts?.length || 0;
      } else {
        debugInfo.accounts_error = await accountsResponse.text();
      }
    } catch (e) {
      debugInfo.accounts_error = e instanceof Error ? e.message : 'Unknown error';
    }

    // Test 3: Fetch transactions with different date ranges
    const testDates = [
      { label: '7_days', days: 7 },
      { label: '30_days', days: 30 },
      { label: '90_days', days: 90 },
    ];

    debugInfo.transactions = {};

    for (const { label, days } of testDates) {
      try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceISO = since.toISOString();

        const txnResponse = await fetch(
          `https://api.monzo.com/transactions?account_id=acc_0000AlrlMJPONVy6d8Mbzu&since=${sinceISO}&expand[]=merchant`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );

        debugInfo.transactions[label] = {
          status: txnResponse.status,
          ok: txnResponse.ok,
          since_date: sinceISO,
          days_back: days,
        };

        if (txnResponse.ok) {
          const txnData = await txnResponse.json();
          debugInfo.transactions[label].count = txnData.transactions?.length || 0;
          debugInfo.transactions[label].transactions_sample = txnData.transactions?.slice(0, 3).map((t: any) => ({
            id: t.id,
            date: t.created,
            description: t.description,
            amount: t.amount,
            category: t.category,
          }));

          // Get date range of returned transactions
          if (txnData.transactions?.length > 0) {
            const dates = txnData.transactions.map((t: any) => new Date(t.created));
            debugInfo.transactions[label].oldest_txn = new Date(Math.min(...dates.map((d: Date) => d.getTime()))).toISOString();
            debugInfo.transactions[label].newest_txn = new Date(Math.max(...dates.map((d: Date) => d.getTime()))).toISOString();
          }
        } else {
          debugInfo.transactions[label].error = await txnResponse.text();
        }
      } catch (e) {
        debugInfo.transactions[label].error = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    return NextResponse.json(debugInfo, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
