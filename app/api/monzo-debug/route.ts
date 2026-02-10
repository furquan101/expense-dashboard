import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const accessToken = process.env.MONZO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ error: 'No token' });
    }

    const since = new Date('2025-12-01T00:00:00Z');
    const url = `https://api.monzo.com/transactions?account_id=acc_0000AlrlMJPONVy6d8Mbzu&since=${since.toISOString()}&limit=100&expand[]=merchant`;

    console.log('Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store'
    });

    const status = response.status;
    const data = await response.json();

    return NextResponse.json({
      status,
      sinceDate: since.toISOString(),
      transactionCount: data.transactions?.length || 0,
      hasTransactions: !!data.transactions,
      error: data.error || data.message,
      firstTransaction: data.transactions?.[0],
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed',
      details: error instanceof Error ? error.message : 'Unknown',
    });
  }
}
