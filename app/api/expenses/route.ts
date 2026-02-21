import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Expense, ExpenseSummary } from '@/lib/types';
import { fetchMonzoTransactions, isLunchExpense, convertToExpense } from '@/lib/monzo-client';
import { getValidAccessToken } from '@/lib/monzo-auth';
import { loadStoredTransactions, mergeAndStore, isBlobConfigured } from '@/lib/transaction-store';

// In-memory cache for full response (CSV + Monzo)
let cachedData: {
  data: ExpenseSummary;
  timestamp: number;
} | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// In-memory cache for CSV (never changes at runtime)
let csvCache: {
  expenses: Expense[];
  workLunchesTotal: number;
  workLunchesCount: number;
  qatarTripTotal: number;
  qatarTripCount: number;
} | null = null;

/**
 * Parses CSV line handling quoted fields
 */
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

/**
 * Loads expenses from CSV file
 */
function loadCSVExpenses(csvPath: string): {
  expenses: Expense[];
  workLunchesTotal: number;
  workLunchesCount: number;
  qatarTripTotal: number;
  qatarTripCount: number;
} {
  const expenses: Expense[] = [];
  let workLunchesTotal = 0;
  let qatarTripTotal = 0;
  let workLunchesCount = 0;
  let qatarTripCount = 0;

  if (!fs.existsSync(csvPath)) {
    return { expenses, workLunchesTotal, workLunchesCount, qatarTripTotal, qatarTripCount };
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  // Parse CSV (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and separators
    if (!line || line.includes('━━━') || line.includes('>>>') ||
        line.includes('═══') || line.includes('Date,Day,Merchant')) {
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

        // Categorize expenses by date range
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

  return { expenses, workLunchesTotal, workLunchesCount, qatarTripTotal, qatarTripCount };
}

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
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'CDN-Cache-Control': 'max-age=300'
        }
      });
    }

    // Load CSV expenses (cached in memory after first read)
    if (!csvCache) {
      const csvPath = process.env.CSV_PATH || path.join(process.cwd(), 'data', 'expenses.csv');
      csvCache = loadCSVExpenses(csvPath);
    }
    // Clone expenses array so we can push Monzo data without mutating cache
    const expenses = [...csvCache.expenses];
    const { workLunchesTotal, workLunchesCount, qatarTripTotal, qatarTripCount } = csvCache;

    // Fetch and merge Monzo transactions
    let newMonzoCount = 0;
    let newMonzoTotal = 0;
    let monzoConnected = false;

    if (includeMonzo) {
      try {
        // Get valid access token (will auto-refresh if expired)
        const accessToken = await getValidAccessToken();
        monzoConnected = true;

        // Fetch recent transactions from Monzo API
        const allTxns = await fetchMonzoTransactions(accessToken, 60);
        console.log(`Monzo: ${allTxns.length} raw transactions fetched`);

        // Filter for lunch expenses and convert
        const monzoExpenses = allTxns.filter(isLunchExpense).map(convertToExpense);
        console.log(`Monzo: ${monzoExpenses.length} after lunch filter`);

        // Persist to Vercel Blob for long-term storage (async, non-blocking)
        let allStoredExpenses = monzoExpenses;
        if (isBlobConfigured()) {
          allStoredExpenses = await mergeAndStore(monzoExpenses);
          console.log(`Blob: ${allStoredExpenses.length} total stored transactions`);
        }

        // Use stored history (includes older transactions beyond 90-day API limit)
        const allMonzoExpenses = isBlobConfigured() ? allStoredExpenses : monzoExpenses;

        // Filter out duplicates (transactions already in CSV)
        const csvKeys = new Set(expenses.map(e => `${e.date}-${e.merchant}-${e.amount}`));
        const newMonzoExpenses = allMonzoExpenses.filter(e => {
          const key = `${e.date}-${e.merchant}-${e.amount}`;
          return !csvKeys.has(key);
        });

        // Only include Monzo transactions after the CSV's last date (Feb 7)
        const recentMonzoExpenses = newMonzoExpenses.filter(e => {
          return e.date > '2026-02-07';
        });

        console.log(`Monzo: ${recentMonzoExpenses.length} expenses to display`);

        newMonzoCount = recentMonzoExpenses.length;
        newMonzoTotal = recentMonzoExpenses.reduce((sum, e) => sum + e.amount, 0);

        expenses.push(...recentMonzoExpenses);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const isAuthError = message === 'MONZO_NOT_CONNECTED' || message === 'MONZO_TOKEN_INVALID' || message === 'MONZO_SCA_REQUIRED';
        const scaRequired = message === 'MONZO_SCA_REQUIRED';

        if (isAuthError) {
          // Even without live Monzo, try loading stored transactions from Blob
          if (isBlobConfigured()) {
            try {
              const stored = await loadStoredTransactions();
              if (stored.length > 0) {
                const csvKeys = new Set(expenses.map(e => `${e.date}-${e.merchant}-${e.amount}`));
                const storedNew = stored.filter(e => {
                  const key = `${e.date}-${e.merchant}-${e.amount}`;
                  return !csvKeys.has(key) && e.date > '2026-02-07';
                });
                newMonzoCount = storedNew.length;
                newMonzoTotal = storedNew.reduce((sum, e) => sum + e.amount, 0);
                expenses.push(...storedNew);
                console.log(`Blob fallback: loaded ${storedNew.length} stored transactions`);
              }
            } catch {
              // Blob also failed, continue with CSV only
            }
          }

          expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return NextResponse.json({
            expenses,
            total: parseFloat((workLunchesTotal + qatarTripTotal + newMonzoTotal).toFixed(2)),
            count: expenses.length,
            workLunches: { total: parseFloat(workLunchesTotal.toFixed(2)), count: workLunchesCount },
            qatarTrip: { total: parseFloat(qatarTripTotal.toFixed(2)), count: qatarTripCount },
            newMonzo: { total: parseFloat(newMonzoTotal.toFixed(2)), count: newMonzoCount },
            lastUpdated: new Date().toISOString(),
            cached: false,
            monzoConnected: false,
            scaRequired,
          }, {
            headers: {
              'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
              'CDN-Cache-Control': 'max-age=300'
            }
          });
        }
        // Unrecognized error — still means Monzo data unavailable
        console.error('Failed to fetch Monzo transactions:', error);
        monzoConnected = false;
      }
    }

    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = workLunchesTotal + qatarTripTotal + newMonzoTotal;

    const responseData: ExpenseSummary & { monzoConnected?: boolean } = {
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
      monzoConnected,
    };

    // Update cache
    cachedData = {
      data: responseData,
      timestamp: Date.now(),
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'max-age=300'
      }
    });
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
