// Shared type definitions for expense tracking

export interface Expense {
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

export interface MonzoTransaction {
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
      region?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
    };
    online?: boolean;
  };
  category: string;
  notes?: string;
}

export interface ExpenseSummary {
  expenses: Expense[];
  total: number;
  count: number;
  workLunches: {
    total: number;
    count: number;
  };
  qatarTrip: {
    total: number;
    count: number;
  };
  newMonzo: {
    total: number;
    count: number;
  };
  lastUpdated: string;
  cached?: boolean;
  cacheAge?: number;
}
