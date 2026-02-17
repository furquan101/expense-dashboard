import type { MonzoTransaction, Expense } from './types';
import { forceRefreshToken } from './monzo-auth';

// Monzo API configuration
const MONZO_API_BASE = 'https://api.monzo.com';
const ACCOUNT_ID = 'acc_0000AlrlMJPONVy6d8Mbzu';
const MAX_ITERATIONS = 10;
const TRANSACTIONS_PER_PAGE = 100;

// Explicit exclusion list for personal contacts/P2P merchant names
// Add merchant names here that should never appear as lunch expenses
const EXCLUDED_MERCHANTS = [
  'Furquan', // Personal contact - P2P payments
];

/**
 * Checks if a Monzo transaction is located in London
 * Uses postcode prefixes, city name, and region
 */
function isInLondon(txn: MonzoTransaction): boolean {
  const addr = txn.merchant?.address;

  // No address data = assume local (many London merchants lack address metadata)
  if (!addr) return true;

  // Online merchants are valid lunch expenses (Deliveroo, Uber Eats, etc.)
  // Don't filter them out — the category filter handles relevance

  const city = (addr.city || '').toLowerCase();
  const region = (addr.region || '').toLowerCase();
  const postcode = (addr.postcode || '').toUpperCase();

  // If no city AND no postcode data, can't determine location — assume local
  if (!city && !region && !postcode) return true;

  // Match by city/region name
  const londonCityNames = ['london', 'city of london', 'greater london'];
  if (londonCityNames.some(name => city.includes(name) || region.includes(name))) {
    return true;
  }

  // Match by London postcode prefixes using regex (much faster than array iteration)
  // Central: EC, WC | East: E | North: N | NW | SE | SW | W
  if (!postcode) return false;

  // Single regex pattern matches all London postcode areas
  // Covers: EC, WC, E1-E20, N1-N22, NW1-NW11, SE1-SE28, SW1-SW20, W1-W14
  const londonPostcodePattern = /^(EC|WC|E|N|NW|SE|SW|W)\d+[A-Z]?\s*\d[A-Z]{2}$/i;
  return londonPostcodePattern.test(postcode);
}

/**
 * Filters Monzo transactions for work lunch expenses in London
 * - Mon-Fri only (work days)
 * - Located in London (by postcode or city)
 * - Food/drink categories (eating_out, groceries, coffee, shopping, general)
 * - Debits only, excludes pot transfers
 */
export function isLunchExpense(txn: MonzoTransaction): boolean {
  // CRITICAL: Only include expenses (money going OUT), not income
  // In Monzo API: negative = debit (expense), positive = credit (income)
  if (txn.amount >= 0) return false; // Exclude all incoming money

  // Get merchant and description for filtering
  const merchantName = txn.merchant?.name || '';
  const description = txn.description || '';
  const lowerMerchant = merchantName.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const combined = `${lowerMerchant} ${lowerDesc}`;

  // Exclude all types of incoming transactions and transfers
  const excludePatterns = [
    // Internal transfers
    'pot_', 'pot transfer', 'savings',
    // Bank transfers
    'bank transfer', 'faster payment', 'bacs',
    // P2P payments
    'payment from', 'sent from', 'received from',
    'transfer from', 'paid you', 'sent you',
    // Refunds and credits
    'refund', 'cashback', 'credit', 'reversal',
    // Salary and income
    'salary', 'wage', 'payroll', 'income',
    // Other incoming
    'deposit', 'interest', 'dividend'
  ];

  for (const pattern of excludePatterns) {
    if (combined.includes(pattern)) {
      return false;
    }
  }

  // Exclude specific transaction schemes that indicate transfers/incoming
  const excludeSchemes = [
    'uk_retail_pot',           // Pot transfers
    'payport_faster_payments', // Bank transfers
    'bacs',                    // Direct debits/credits
    'faster_payments'          // Bank transfers
  ];

  if (excludeSchemes.includes(txn.scheme || '')) {
    return false;
  }

  // ONLY include transactions with actual merchants (not person-to-person)
  // P2P transactions typically don't have a merchant object
  if (!txn.merchant || !txn.merchant.name) {
    return false; // Exclude transactions without merchants (likely P2P)
  }

  // Exclude transactions from the explicit exclusion list
  if (EXCLUDED_MERCHANTS.includes(merchantName)) {
    return false; // Explicitly excluded personal contact
  }

  // Exclude transactions where merchant name looks like a person's name
  // Two-word names with proper capitalization (e.g., "John Smith")
  // This pattern catches common P2P payment formats
  const twoWordNamePattern = /^[A-Z][a-z]+ [A-Z][a-z]+$/;
  if (twoWordNamePattern.test(merchantName)) {
    return false; // Likely a person-to-person payment
  }

  // Note: We don't filter single-word names as they could be legitimate shops
  // (e.g., "Amee", "Pret", "Tesco"). Use the EXCLUDED_MERCHANTS list above
  // for specific personal contacts you want to exclude.

  // Check day of week (Mon-Fri for office lunches)
  const date = new Date(txn.created);
  const day = date.getDay();
  const isWorkDay = day >= 1 && day <= 5; // Mon-Fri

  // Must be in London
  if (!isInLondon(txn)) return false;

  // Food/drink categories - broad to catch miscategorized lunch places
  const foodCategories = ['eating_out', 'groceries', 'coffee', 'shopping', 'general'];
  const isFoodCategory = foodCategories.includes(txn.category);

  return isWorkDay && isFoodCategory;
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
    purpose: 'Working lunch',
    location: txn.merchant?.address?.short_formatted || txn.merchant?.address?.city || 'London',
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
  daysSince: number = 60,
  _retried: boolean = false
): Promise<MonzoTransaction[]> {
  // Fetch last N days
  // Note: Monzo API allows up to 90 days after initial 5-minute auth window
  // See: https://docs.monzo.com/ - Strong Customer Authentication
  const since = new Date();
  since.setDate(since.getDate() - daysSince);

  // Fetch with pagination - Monzo returns oldest first, so we paginate forward
  // by updating `since` to the last transaction's ID/timestamp
  const allTransactions: MonzoTransaction[] = [];
  const seenIds = new Set<string>(); // Detect duplicates for early exit
  let sinceParam = since.toISOString();
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    const url = `${MONZO_API_BASE}/transactions?account_id=${ACCOUNT_ID}&since=${sinceParam}&limit=${TRANSACTIONS_PER_PAGE}&expand[]=merchant`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Monzo API error:', response.status, errorText);

      // 401 = token evicted/invalid — retry once with a fresh token
      if (response.status === 401 && !_retried) {
        console.log('Monzo 401 — force-refreshing token and retrying...');
        const freshToken = await forceRefreshToken();
        return fetchMonzoTransactions(freshToken, daysSince, true);
      }
      if (response.status === 401) {
        throw new Error('MONZO_TOKEN_INVALID');
      }

      // Handle rate limiting (429) - wait and retry with exponential backoff
      if (response.status === 429 && iteration < MAX_ITERATIONS - 1) {
        const retryAfter = response.headers.get('Retry-After');
        // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
        const backoffMs = Math.min(2000 * Math.pow(2, iteration), 30000);
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoffMs;
        console.log(`Rate limited, waiting ${waitTime}ms before retry (iteration ${iteration})`);
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

    // Check for duplicates and filter them out (early exit optimization)
    let duplicateCount = 0;
    const newTransactions = transactions.filter(txn => {
      if (seenIds.has(txn.id)) {
        duplicateCount++;
        return false;
      }
      seenIds.add(txn.id);
      return true;
    });

    // If entire page is duplicates, we've caught up - exit early
    if (duplicateCount === transactions.length) {
      console.log(`Monzo: All ${duplicateCount} transactions on page ${iteration + 1} were duplicates, stopping`);
      break;
    }

    allTransactions.push(...newTransactions);

    if (transactions.length < TRANSACTIONS_PER_PAGE) {
      break; // Last page - fewer results than limit
    }

    // Move `since` cursor forward to the last transaction's ID for next page
    // Monzo accepts transaction IDs as the `since` param for precise pagination
    const lastTxn = transactions[transactions.length - 1];
    sinceParam = lastTxn.id || lastTxn.created;
    iteration++;
  }

  console.log(`Monzo: fetched ${allTransactions.length} transactions in ${iteration + 1} pages`);
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
