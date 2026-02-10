import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Expense {
  date: string;
  day: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  expenseType: string;
  purpose: string;
  location: string;
  receiptAttached: string;
  notes: string;
}

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
      postcode?: string;
    };
  };
  category: string;
  notes?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function fetchLatestMonzoTransactions() {
  try {
    // Use environment variable for Vercel deployment
    const accessToken = process.env.MONZO_ACCESS_TOKEN;

    if (!accessToken) {
      console.log('No Monzo token configured');
      return [];
    }

    // Fetch last 90 days to cover Dec 2025 + Jan-Feb 2026
    const since = new Date();
    since.setDate(since.getDate() - 90);

    // Fetch with pagination (increased iterations for Jan-Feb 2026)
    const allTransactions: MonzoTransaction[] = [];
    let before = '';
    const maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      const url = before
        ? `https://api.monzo.com/transactions?account_id=acc_0000AlrlMJPONVy6d8Mbzu&since=${since.toISOString()}&before=${before}&limit=100&expand[]=merchant`
        : `https://api.monzo.com/transactions?account_id=acc_0000AlrlMJPONVy6d8Mbzu&since=${since.toISOString()}&limit=100&expand[]=merchant`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error('Monzo API error:', response.status, await response.text());
        break;
      }

      const data = await response.json();
      const transactions = data.transactions as MonzoTransaction[];

      if (!transactions || transactions.length === 0) {
        break;
      }

      allTransactions.push(...transactions);

      if (transactions.length < 100) {
        break;
      }

      before = transactions[transactions.length - 1].created;
      iteration++;
    }

    const transactions = allTransactions;

    // Filter for lunch expenses only
    const isLunchExpense = (txn: MonzoTransaction): boolean => {
      if (txn.amount >= 0) return false; // Only debits
      if (txn.description.toLowerCase().includes('pot_')) return false; // Skip pot transfers

      const merchantName = txn.merchant?.name || txn.description || '';
      const shortFormatted = txn.merchant?.address?.short_formatted || '';
      const postcode = txn.merchant?.address?.postcode || '';
      const city = txn.merchant?.address?.city || '';

      const fullLocation = `${merchantName} ${shortFormatted} ${postcode} ${city}`.toLowerCase();

      // Kings Cross postcodes and keywords
      const kingsXPostcodes = ['n1c', 'wc1x', 'wc1h'];
      const kingsXKeywords = ['kings cross', 'pancras', 'st pancras'];

      const hasKingsXPostcode = kingsXPostcodes.some(pc => postcode.toLowerCase().includes(pc));
      const hasKingsXKeyword = kingsXKeywords.some(kw => fullLocation.includes(kw));
      const isKingsX = hasKingsXPostcode || hasKingsXKeyword;

      // Exclude areas that are definitely NOT Kings Cross
      const excludeAreas = ['basildon', 'ss15', 'e1 1', 'e1d', 'sw1', 'victoria', 'wc1b', 'wc2', 'shoreditch', 'whitechapel', 'southampton row'];
      const isExcluded = excludeAreas.some(area => fullLocation.includes(area));

      // Check day of week (Mon-Thu for office lunches)
      const date = new Date(txn.created);
      const day = date.getDay();
      const isWorkDay = day >= 1 && day <= 4; // Mon-Thu

      // Food categories only
      const isFoodCategory = ['eating_out'].includes(txn.category);

      return isWorkDay && isKingsX && isFoodCategory && !isExcluded;
    };

    // Convert to expense format
    const monzoExpenses: Expense[] = transactions
      .filter(isLunchExpense)
      .map(txn => {
        const date = new Date(txn.created);
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

        return {
          date: date.toISOString().split('T')[0],
          day: dayNames[date.getDay()],
          merchant: txn.merchant?.name || txn.description,
          amount: Math.abs(txn.amount) / 100,
          currency: 'GBP',
          category: txn.category === 'eating_out' ? 'Meals & Entertainment' : 'General',
          expenseType: txn.category === 'eating_out' ? 'Meals' : 'Other',
          purpose: 'Recent transaction from Monzo',
          location: txn.merchant?.address?.short_formatted || txn.merchant?.address?.city || '',
          receiptAttached: 'No',
          notes: `Monzo - ${txn.category}`
        };
      });

    return monzoExpenses;
  } catch (error) {
    console.error('Error fetching Monzo transactions:', error);
    return [];
  }
}

// In-memory cache to avoid fetching Monzo on every request
let cachedData: {
  data: any;
  timestamp: number;
} | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMonzo = searchParams.get('includeMonzo') !== 'false';
    const skipCache = searchParams.get('skipCache') === 'true';

    // Check cache first (unless skipCache is requested)
    const now = Date.now();
    if (!skipCache && cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedData.data,
        cached: true,
        cacheAge: Math.floor((now - cachedData.timestamp) / 1000),
      });
    }

    const expenses: Expense[] = [];
    let workLunchesTotal = 0;
    let qatarTripTotal = 0;
    let workLunchesCount = 0;
    let qatarTripCount = 0;

    // Try to load CSV if available (local development)
    const csvPath = process.env.CSV_PATH || path.join(process.env.HOME || '', 'Downloads', 'coupa_expenses.csv');

    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');

      // Parse CSV
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line ||
            line.includes('━━━') ||
            line.includes('>>>') ||
            line.includes('═══') ||
            line.includes('Date,Day,Merchant')) {
          continue;
        }

        const fields = parseCSVLine(line);

        if (fields.length >= 11 && fields[0] && fields[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
          const date = fields[0];
          const amount = parseFloat(fields[3]);

          if (!isNaN(amount) && amount > 0) {
            expenses.push({
              date: fields[0],
              day: fields[1],
              merchant: fields[2],
              amount: amount,
              currency: fields[4],
              category: fields[5],
              expenseType: fields[6],
              purpose: fields[7],
              location: fields[8],
              receiptAttached: fields[9],
              notes: fields[10]
            });

            if (date.startsWith('2025-12') || (date.startsWith('2026-01') && parseInt(date.split('-')[2]) <= 22)) {
              workLunchesTotal += amount;
              workLunchesCount++;
            } else if (date.startsWith('2026-02')) {
              qatarTripTotal += amount;
              qatarTripCount++;
            }
          }
        }
      }
    } else {
      console.log('CSV file not found, using Monzo data only');
    }

    // Fetch and merge Monzo transactions
    let monzoExpenses: Expense[] = [];
    let newMonzoCount = 0;
    let newMonzoTotal = 0;

    if (includeMonzo) {
      monzoExpenses = await fetchLatestMonzoTransactions();

      // Filter out duplicates (transactions already in CSV)
      const csvDates = new Set(expenses.map(e => `${e.date}-${e.merchant}-${e.amount}`));
      const newMonzoExpenses = monzoExpenses.filter(e => {
        const key = `${e.date}-${e.merchant}-${e.amount}`;
        return !csvDates.has(key);
      });

      // Exclude Qatar trip dates (Feb 1-7) as those are fully covered in CSV
      // Include everything else that's not a duplicate
      const recentMonzoExpenses = newMonzoExpenses.filter(e => {
        const date = e.date;
        // Exclude Qatar trip period (fully documented in CSV)
        if (date >= '2026-02-01' && date <= '2026-02-07') {
          return false;
        }
        // Include all other non-duplicate transactions
        return true;
      });

      newMonzoCount = recentMonzoExpenses.length;
      newMonzoTotal = recentMonzoExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Add to expenses array
      expenses.push(...recentMonzoExpenses);
    }

    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = workLunchesTotal + qatarTripTotal + newMonzoTotal;

    const responseData = {
      expenses,
      total: parseFloat(total.toFixed(2)),
      count: expenses.length,
      workLunches: {
        total: parseFloat(workLunchesTotal.toFixed(2)),
        count: workLunchesCount
      },
      qatarTrip: {
        total: parseFloat(qatarTripTotal.toFixed(2)),
        count: qatarTripCount
      },
      newMonzo: {
        total: parseFloat(newMonzoTotal.toFixed(2)),
        count: newMonzoCount
      },
      lastUpdated: new Date().toISOString(),
      cached: false,
    };

    // Update cache
    cachedData = {
      data: responseData,
      timestamp: Date.now(),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error reading expenses:', error);
    return NextResponse.json(
      {
        error: 'Failed to read expenses',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
