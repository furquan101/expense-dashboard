/**
 * Persistent transaction storage using Vercel Blob.
 * Stores all Monzo transactions so they're viewable beyond the 90-day API limit.
 * Transactions are stored as a JSON blob, keyed by transaction ID to avoid duplicates.
 */

import { put, list, head } from '@vercel/blob';
import type { Expense } from './types';

const BLOB_PATH = 'transactions/monzo-expenses.json';

interface StoredTransactions {
  expenses: Expense[];
  lastUpdated: string;
  oldestDate: string;
  newestDate: string;
}

/**
 * Load all stored transactions from Vercel Blob
 */
export async function loadStoredTransactions(): Promise<Expense[]> {
  try {
    // List blobs to find our file
    const { blobs } = await list({ prefix: 'transactions/' });
    const blob = blobs.find(b => b.pathname === BLOB_PATH);
    if (!blob) return [];

    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) return [];

    const data: StoredTransactions = await response.json();
    return data.expenses || [];
  } catch (error) {
    console.error('Failed to load stored transactions:', error);
    return [];
  }
}

/**
 * Merge new expenses into the stored set and save.
 * Deduplicates by date + merchant + amount key.
 * Returns the full merged list.
 */
export async function mergeAndStore(newExpenses: Expense[]): Promise<Expense[]> {
  // Load existing
  const existing = await loadStoredTransactions();

  // Build a Set of existing keys for fast dedup
  const existingKeys = new Set(
    existing.map(e => `${e.date}|${e.merchant}|${e.amount}`)
  );

  // Find genuinely new transactions
  const toAdd = newExpenses.filter(e => {
    const key = `${e.date}|${e.merchant}|${e.amount}`;
    return !existingKeys.has(key);
  });

  if (toAdd.length === 0) {
    return existing; // Nothing new to store
  }

  const merged = [...existing, ...toAdd];
  // Sort by date descending
  merged.sort((a, b) => b.date.localeCompare(a.date));

  const dates = merged.map(e => e.date);
  const data: StoredTransactions = {
    expenses: merged,
    lastUpdated: new Date().toISOString(),
    oldestDate: dates[dates.length - 1],
    newestDate: dates[0],
  };

  try {
    await put(BLOB_PATH, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });
    console.log(`Stored ${merged.length} transactions (${toAdd.length} new)`);
  } catch (error) {
    console.error('Failed to store transactions:', error);
  }

  return merged;
}

/**
 * Check if blob store is configured (BLOB_READ_WRITE_TOKEN exists)
 */
export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}
