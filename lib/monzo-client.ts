import type { MonzoTransaction, Expense } from './types';

// Monzo API configuration
const MONZO_API_BASE = 'https://api.monzo.com';
const ACCOUNT_ID = 'acc_0000AlrlMJPONVy6d8Mbzu';
const MAX_ITERATIONS = 10;
const TRANSACTIONS_PER_PAGE = 100;

/**
 * Filters Monzo transactions for work lunch expenses
 * - Mon-Fri only (work days)
 * - Food/drink categories (eating_out, groceries, coffee, shopping)
 * - Debits only, excludes pot transfers and transport
 */
export function isLunchExpense(txn: MonzoTransaction): boolean {
  if (txn.amount >= 0) return false; // Only debits

  const merchantName = txn.merchant?.name || txn.description || '';
  if (merchantName.toLowerCase().includes('pot_')) return false; // Skip pot transfers

  // Check day of week (Mon-Fri for office lunches)
  const date = new Date(txn.created);
  const day = date.getDay();
  const isWorkDay = day >= 1 && day <= 5; // Mon-Fri

  // Food/drink categories - broad to catch miscategorized lunch places
  const foodCategories = ['eating_out', 'groceries', 'coffee', 'shopping', 'general'];
  const isFoodCategory = foodCategories.includes(txn.category);

  const result = isWorkDay && isFoodCategory;
  
  // Debug log for Feb transactions
  const txnDate = date.toISOString().split('T')[0];
  if (txnDate >= '2026-02-08' && txnDate <= '2026-02-14') {
    console.error('[Monzo Filter Debug] Feb 8-14 transaction:', {
      date: txnDate,
      merchant: merchantName,
      amount: Math.abs(txn.amount) / 100,
      category: txn.category,
      dayOfWeek: day,
      isWorkDay,
      isFoodCategory,
      passed: result
    });
  }

  return result;
}

/**
 * Converts Monzo transaction to Expense format
 */
export function convertToExpense(txn: MonzoTransaction): Expense {
  const date = new Date(txn.created);
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return {
    date: date.toISOString().split('T')[0],
    day: dayNames[date.getDay()],
    merchant: txn.merchant?.name || txn.description,
    amount: Math.abs(txn.amount) / 100,
    currency: 'GBP',
    category: ['eating_out', 'coffee', 'groceries'].includes(txn.category) ? 'Meals & Entertainment' : 'General',
    expenseType: 'Lunch',
    purpose: 'Working lunch - Kings Cross office',
    location: txn.merchant?.address?.short_formatted || txn.merchant?.address?.city || '',
    receiptAttached: 'No',
    notes: `Monzo - ${txn.category}`
  };
}

/**
 * Fetches transactions from Monzo API with pagination
 * @param accessToken - Monzo API access token (will auto-refresh if expired)
 * @param daysSince - Number of days to look back (max 90 due to SCA)
 * @returns Array of Monzo transactions
 */
export async function fetchMonzoTransactions(
  accessToken: string,
  daysSince: number = 60
): Promise<MonzoTransaction[]> {
  // Fetch last N days
  // Note: Monzo API allows up to 90 days after initial 5-minute auth window
  // See: https://docs.monzo.com/ - Strong Customer Authentication
  const since = new Date();
  since.setDate(since.getDate() - daysSince);

  // Fetch with pagination (increased iterations for longer date ranges)
  const allTransactions: MonzoTransaction[] = [];
  let before = '';
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    const url = before
      ? `${MONZO_API_BASE}/transactions?account_id=${ACCOUNT_ID}&since=${since.toISOString()}&before=${before}&limit=${TRANSACTIONS_PER_PAGE}&expand[]=merchant`
      : `${MONZO_API_BASE}/transactions?account_id=${ACCOUNT_ID}&since=${since.toISOString()}&limit=${TRANSACTIONS_PER_PAGE}&expand[]=merchant`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Monzo API error:', response.status, errorText);

      // Handle rate limiting (429) - wait and retry
      if (response.status === 429 && iteration < MAX_ITERATIONS - 1) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
        console.log(`Rate limited, waiting ${waitTime}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue; // Retry same request
      }

      break;
    }

    const data = await response.json();
    const transactions = data.transactions as MonzoTransaction[];

    if (!transactions || transactions.length === 0) {
      break;
    }

    allTransactions.push(...transactions);

    if (transactions.length < TRANSACTIONS_PER_PAGE) {
      break;
    }

    before = transactions[transactions.length - 1].created;
    iteration++;
  }

  return allTransactions;
}

/**
 * Fetches and filters lunch expenses from Monzo
 */
export async function fetchLunchExpenses(
  accessToken: string,
  daysSince: number = 60
): Promise<Expense[]> {
  const transactions = await fetchMonzoTransactions(accessToken, daysSince);

  return transactions
    .filter(isLunchExpense)
    .map(convertToExpense);
}
