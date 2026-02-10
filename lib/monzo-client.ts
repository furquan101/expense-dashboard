import type { MonzoTransaction, Expense } from './types';

// Monzo API configuration
const MONZO_API_BASE = 'https://api.monzo.com';
const ACCOUNT_ID = 'acc_0000AlrlMJPONVy6d8Mbzu';
const MAX_ITERATIONS = 10;
const TRANSACTIONS_PER_PAGE = 100;

/**
 * Filters Monzo transactions for Kings Cross lunch expenses
 * - Mon-Thu only (work days)
 * - Kings Cross location (N1C, WC1X, WC1H postcodes)
 * - eating_out category
 */
export function isLunchExpense(txn: MonzoTransaction): boolean {
  if (txn.amount >= 0) return false; // Only debits

  const merchantName = txn.merchant?.name || txn.description || '';
  if (merchantName.toLowerCase().includes('pot_')) return false; // Skip pot transfers

  const postcode = txn.merchant?.address?.postcode || '';
  const city = txn.merchant?.address?.city || '';
  const shortFormatted = txn.merchant?.address?.short_formatted || '';
  const fullLocation = `${merchantName} ${shortFormatted} ${postcode} ${city}`.toLowerCase();

  // Kings Cross postcodes and keywords
  const kingsXPostcodes = ['n1c', 'wc1x', 'wc1h'];
  const kingsXKeywords = ['kings cross', 'pancras', 'st pancras'];
  const hasKingsXPostcode = kingsXPostcodes.some(pc => postcode.toLowerCase().includes(pc));
  const hasKingsXKeyword = kingsXKeywords.some(kw => fullLocation.includes(kw));
  const isKingsX = hasKingsXPostcode || hasKingsXKeyword;

  if (!isKingsX) return false;

  // Exclude areas that are definitely NOT Kings Cross
  const excludeAreas = ['basildon', 'ss15', 'e1 1', 'e1d', 'sw1', 'victoria', 'wc1b', 'wc2', 'shoreditch', 'whitechapel', 'southampton row'];
  const isExcluded = excludeAreas.some(area => fullLocation.includes(area));
  if (isExcluded) return false;

  // Check day of week (Mon-Thu for office lunches)
  const date = new Date(txn.created);
  const day = date.getDay();
  const isWorkDay = day >= 1 && day <= 4; // Mon-Thu

  // Food categories - include groceries as many lunch places get miscategorized
  const isFoodCategory = ['eating_out', 'groceries'].includes(txn.category);

  return isWorkDay && isKingsX && isFoodCategory;
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
    category: txn.category === 'eating_out' ? 'Meals & Entertainment' : 'General',
    expenseType: txn.category === 'eating_out' ? 'Meals' : 'Other',
    purpose: 'Recent transaction from Monzo',
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
