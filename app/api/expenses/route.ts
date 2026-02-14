import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Expense, ExpenseSummary } from '@/lib/types';
import { fetchMonzoTransactions, isLunchExpense, convertToExpense } from '@/lib/monzo-client';
import { getValidAccessToken } from '@/lib/monzo-auth';

// In-memory cache to avoid fetching Monzo on every request
let cachedData: {
  data: ExpenseSummary;
  timestamp: number;
} | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
      });
    }

    // Load CSV expenses
    const csvPath = process.env.CSV_PATH || path.join(process.cwd(), 'data', 'expenses.csv');
    const {
      expenses,
      workLunchesTotal,
      workLunchesCount,
      qatarTripTotal,
      qatarTripCount
    } = loadCSVExpenses(csvPath);

    // Fetch and merge Monzo transactions
    let newMonzoCount = 0;
    let newMonzoTotal = 0;

    if (includeMonzo) {
      try {
        // Get valid access token (will auto-refresh if expired)
        const accessToken = await getValidAccessToken();
        // Fetch all transactions (single API call)
        const allTxns = await fetchMonzoTransactions(accessToken, 60);
        console.log(`📊 Monzo: ${allTxns.length} total transactions`);
        const debits = allTxns.filter(t => t.amount < 0);
        console.log(`📊 Monzo: ${debits.length} debits`);
        debits.slice(0, 10).forEach(txn => {
          console.log(`  ${new Date(txn.created).toISOString().split('T')[0]} | ${txn.merchant?.name || txn.description} | £${Math.abs(txn.amount)/100} | cat:${txn.category}`);
        });

        // Filter for lunch expenses and convert
        const monzoExpenses = allTxns.filter(isLunchExpense).map(convertToExpense);
        console.log(`📊 Monzo: ${monzoExpenses.length} after lunch filter`);
        
        // Debug: Check Feb 8-14 specifically
        const feb8to14 = monzoExpenses.filter(e => e.date >= '2026-02-08' && e.date <= '2026-02-14');
        console.error('[Expenses Debug] Feb 8-14 after lunch filter:', {
          count: feb8to14.length,
          transactions: feb8to14.map(e => ({date: e.date, merchant: e.merchant, amount: e.amount}))
        });

        // Filter out duplicates (transactions already in CSV)
        const csvDates = new Set(expenses.map(e => `${e.date}-${e.merchant}-${e.amount}`));
        const newMonzoExpenses = monzoExpenses.filter(e => {
          const key = `${e.date}-${e.merchant}-${e.amount}`;
          const isDupe = csvDates.has(key);
          if (e.date >= '2026-02-08' && e.date <= '2026-02-14' && isDupe) {
            console.error('[Expenses Debug] Feb 8-14 marked as duplicate:', {date: e.date, merchant: e.merchant, amount: e.amount});
          }
          return !isDupe;
        });

        console.log(`📊 Monzo: ${newMonzoExpenses.length} after deduplication`);

        // Exclude Qatar trip dates (Feb 1-7) as those are fully covered in CSV
        const recentMonzoExpenses = newMonzoExpenses.filter(e => {
          const date = e.date;
          // Exclude Qatar trip period (fully documented in CSV)
          const isQatarPeriod = date >= '2026-02-01' && date <= '2026-02-07';
          if (date >= '2026-02-08' && date <= '2026-02-14' && isQatarPeriod) {
            console.error('[Expenses Debug] WRONG: Feb 8-14 incorrectly marked as Qatar period:', {date});
          }
          return !isQatarPeriod;
        });

        console.log(`📊 Monzo: ${recentMonzoExpenses.length} after date filtering`);
        console.error('[Expenses Debug] Final Feb 8-14 count:', {
          count: recentMonzoExpenses.filter(e => e.date >= '2026-02-08' && e.date <= '2026-02-14').length,
          transactions: recentMonzoExpenses.filter(e => e.date >= '2026-02-08' && e.date <= '2026-02-14').map(e => ({date: e.date, merchant: e.merchant, amount: e.amount}))
        });
        
        if (recentMonzoExpenses.length > 0) {
          console.log('📊 Monzo transactions:', recentMonzoExpenses.map(e => `${e.date} ${e.merchant} £${e.amount}`));
        }

        newMonzoCount = recentMonzoExpenses.length;
        newMonzoTotal = recentMonzoExpenses.reduce((sum, e) => sum + e.amount, 0);

        expenses.push(...recentMonzoExpenses);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'MONZO_NOT_CONNECTED') {
          // Return partial data with connection status
          expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return NextResponse.json({
            expenses,
            total: parseFloat((workLunchesTotal + qatarTripTotal).toFixed(2)),
            count: expenses.length,
            workLunches: { total: parseFloat(workLunchesTotal.toFixed(2)), count: workLunchesCount },
            qatarTrip: { total: parseFloat(qatarTripTotal.toFixed(2)), count: qatarTripCount },
            newMonzo: { total: 0, count: 0 },
            lastUpdated: new Date().toISOString(),
            cached: false,
            monzoConnected: false,
          });
        }
        console.error('Failed to fetch Monzo transactions:', error);
        // Continue without Monzo data
      }
    }

    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = workLunchesTotal + qatarTripTotal + newMonzoTotal;

    const responseData: ExpenseSummary = {
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
