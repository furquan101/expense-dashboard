import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/monzo-auth';

export const dynamic = 'force-dynamic';

/**
 * List Monzo accounts
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    const response = await fetch('https://api.monzo.com/accounts', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Monzo API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      accounts: data.accounts.map((acc: any) => ({
        id: acc.id,
        description: acc.description,
        type: acc.type,
        closed: acc.closed,
      })),
      message: 'Use one of these account IDs in monzo-client.ts',
    });
  } catch (error) {
    console.error('Accounts error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
