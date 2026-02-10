import { NextResponse } from 'next/server';

interface MonzoTransaction {
  id: string;
  created: string;
  description: string;
  amount: number;
  merchant?: {
    name?: string;
    address?: {
      city?: string;
      short_formatted?: string;
      address?: string;
      postcode?: string;
    };
  };
  category: string;
}

export async function GET() {
  try {
    const accessToken = process.env.MONZO_ACCESS_TOKEN;

    const since = new Date();
    since.setDate(since.getDate() - 14);

    const response = await fetch(
      `https://api.monzo.com/transactions?account_id=acc_0000AlrlMJPONVy6d8Mbzu&since=${since.toISOString()}&limit=100&expand[]=merchant`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store'
      }
    );

    const data = await response.json();
    const transactions = data.transactions as MonzoTransaction[];

    // Analyze location data format
    const analysis = transactions
      .filter(t => t.amount < 0)
      .filter(t => !t.description.toLowerCase().includes('pot_'))
      .slice(0, 10)
      .map(t => ({
        merchant: t.merchant?.name || t.description,
        city: t.merchant?.address?.city,
        short: t.merchant?.address?.short_formatted,
        full: t.merchant?.address?.address,
        postcode: t.merchant?.address?.postcode,
        category: t.category,
        amount: Math.abs(t.amount) / 100
      }));

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
