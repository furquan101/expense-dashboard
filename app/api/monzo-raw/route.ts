import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/monzo-auth';
import { fetchMonzoTransactions } from '@/lib/monzo-client';

export const dynamic = 'force-dynamic';

/**
 * Raw Monzo transactions endpoint (no filtering)
 * Shows ALL recent transactions to debug filtering issues
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    // Fetch last 30 days
    const transactions = await fetchMonzoTransactions(accessToken, 30);

    // Show first 20 transactions with key details
    const summary = transactions.slice(0, 20).map(txn => ({
      date: new Date(txn.created).toISOString().split('T')[0],
      day: new Date(txn.created).toLocaleDateString('en-US', { weekday: 'short' }),
      merchant: txn.merchant?.name || txn.description,
      amount: `£${Math.abs(txn.amount) / 100}`,
      category: txn.category,
      postcode: txn.merchant?.address?.postcode || 'N/A',
      location: txn.merchant?.address?.short_formatted || 'N/A',
    }));

    return NextResponse.json({
      success: true,
      totalTransactions: transactions.length,
      last30Days: summary,
      message: 'Showing ALL recent transactions (no filters applied)',
    });
  } catch (error) {
    console.error('Monzo raw API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
