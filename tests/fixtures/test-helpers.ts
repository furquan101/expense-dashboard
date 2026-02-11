/**
 * Test fixtures and helpers for Playwright tests
 *
 * This file provides reusable test utilities for:
 * - Mock API responses
 * - Test data generation
 * - Common assertions
 * - Authentication mocking
 */

import type { Page, APIResponse, Route } from '@playwright/test';
import type { ExpenseSummary, Expense } from '../../lib/types';

/**
 * Mock expense data factory
 */
export class ExpenseFactory {
  /**
   * Creates a valid expense object
   */
  static createExpense(overrides?: Partial<Expense>): Expense {
    const date = new Date('2026-02-10');
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    return {
      date: '2026-02-10',
      day: dayNames[date.getDay()],
      merchant: 'Test Merchant',
      amount: 10.50,
      currency: 'GBP',
      category: 'Meals & Entertainment',
      expenseType: 'Meals',
      purpose: 'Work lunch',
      location: 'Kings Cross',
      receiptAttached: 'No',
      notes: '',
      ...overrides
    };
  }

  /**
   * Creates multiple expenses for testing
   */
  static createExpenses(count: number, baseOverrides?: Partial<Expense>): Expense[] {
    return Array.from({ length: count }, (_, i) =>
      this.createExpense({
        ...baseOverrides,
        merchant: `${baseOverrides?.merchant || 'Merchant'} ${i + 1}`,
        amount: 10 + i * 0.5
      })
    );
  }

  /**
   * Creates a Monzo expense (recent transaction)
   */
  static createMonzoExpense(overrides?: Partial<Expense>): Expense {
    return this.createExpense({
      date: '2026-02-10',
      day: 'MON',
      notes: 'Monzo - eating_out',
      purpose: 'Recent transaction from Monzo',
      ...overrides
    });
  }

  /**
   * Creates expenses in Qatar trip date range (Feb 1-7)
   */
  static createQatarTripExpenses(count: number): Expense[] {
    const qatarDates = ['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06', '2026-02-07'];
    const dayNames = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];

    return Array.from({ length: count }, (_, i) => {
      const dateIndex = i % qatarDates.length;
      return this.createExpense({
        date: qatarDates[dateIndex],
        day: dayNames[dateIndex],
        merchant: `Qatar Merchant ${i + 1}`,
        location: 'Doha, Qatar',
        amount: 20 + i * 1.5
      });
    });
  }
}

/**
 * Mock API response factory
 */
export class APIResponseFactory {
  /**
   * Creates a valid ExpenseSummary response
   */
  static createExpenseSummary(overrides?: Partial<ExpenseSummary>): ExpenseSummary {
    const workLunchExpenses = ExpenseFactory.createExpenses(5, { location: 'Kings Cross' });
    const qatarExpenses = ExpenseFactory.createQatarTripExpenses(3);
    const monzoExpenses = [
      ExpenseFactory.createMonzoExpense({ date: '2026-02-10', merchant: 'Pret A Manger', amount: 8.50 }),
      ExpenseFactory.createMonzoExpense({ date: '2026-02-11', merchant: 'Leon', amount: 9.25 })
    ];

    const allExpenses = [...workLunchExpenses, ...qatarExpenses, ...monzoExpenses];
    const workLunchesTotal = workLunchExpenses.reduce((sum, e) => sum + e.amount, 0);
    const qatarTotal = qatarExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monzoTotal = monzoExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      expenses: allExpenses,
      total: parseFloat((workLunchesTotal + qatarTotal + monzoTotal).toFixed(2)),
      count: allExpenses.length,
      workLunches: {
        total: parseFloat(workLunchesTotal.toFixed(2)),
        count: workLunchExpenses.length
      },
      qatarTrip: {
        total: parseFloat(qatarTotal.toFixed(2)),
        count: qatarExpenses.length
      },
      newMonzo: {
        total: parseFloat(monzoTotal.toFixed(2)),
        count: monzoExpenses.length
      },
      lastUpdated: new Date().toISOString(),
      cached: false,
      ...overrides
    };
  }

  /**
   * Creates an empty response (no expenses)
   */
  static createEmptyResponse(): ExpenseSummary {
    return {
      expenses: [],
      total: 0,
      count: 0,
      workLunches: { total: 0, count: 0 },
      qatarTrip: { total: 0, count: 0 },
      newMonzo: { total: 0, count: 0 },
      lastUpdated: new Date().toISOString(),
      cached: false
    };
  }

  /**
   * Creates a response with only CSV data (no Monzo)
   */
  static createCSVOnlyResponse(): ExpenseSummary {
    return this.createExpenseSummary({
      newMonzo: { total: 0, count: 0 }
    });
  }

  /**
   * Creates an error response
   */
  static createErrorResponse(message: string = 'Internal Server Error') {
    return {
      error: 'Failed to read expenses',
      details: message
    };
  }
}

/**
 * API mocking helpers
 */
export class APIMockHelper {
  /**
   * Mocks the /api/expenses endpoint with custom data
   */
  static async mockExpensesAPI(
    page: Page,
    response: ExpenseSummary | { error: string; details: string },
    statusCode: number = 200
  ): Promise<void> {
    await page.route('**/api/expenses*', route => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mocks API failure
   */
  static async mockAPIFailure(page: Page, statusCode: number = 500): Promise<void> {
    await page.route('**/api/expenses*', route => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify(APIResponseFactory.createErrorResponse())
      });
    });
  }

  /**
   * Mocks slow API response
   */
  static async mockSlowAPI(page: Page, delayMs: number = 2000): Promise<void> {
    await page.route('**/api/expenses*', async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      const response = APIResponseFactory.createExpenseSummary();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mocks Monzo API unavailability (returns CSV data only)
   */
  static async mockMonzoUnavailable(page: Page): Promise<void> {
    const response = APIResponseFactory.createCSVOnlyResponse();
    await APIMockHelper.mockExpensesAPI(page, response);
  }
}

/**
 * Common test assertions
 */
export class TestAssertions {
  /**
   * Validates expense data structure
   */
  static validateExpense(expense: any): void {
    if (!expense.date || typeof expense.date !== 'string') {
      throw new Error('Invalid expense.date');
    }
    if (!expense.day || typeof expense.day !== 'string') {
      throw new Error('Invalid expense.day');
    }
    if (!expense.merchant || typeof expense.merchant !== 'string') {
      throw new Error('Invalid expense.merchant');
    }
    if (typeof expense.amount !== 'number' || expense.amount <= 0) {
      throw new Error('Invalid expense.amount');
    }
    if (!expense.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error('Invalid date format');
    }
  }

  /**
   * Validates ExpenseSummary structure
   */
  static validateExpenseSummary(data: any): void {
    if (!Array.isArray(data.expenses)) {
      throw new Error('expenses must be an array');
    }
    if (typeof data.total !== 'number') {
      throw new Error('total must be a number');
    }
    if (typeof data.count !== 'number') {
      throw new Error('count must be a number');
    }
    if (!data.workLunches || typeof data.workLunches.total !== 'number') {
      throw new Error('Invalid workLunches structure');
    }
    if (!data.qatarTrip || typeof data.qatarTrip.total !== 'number') {
      throw new Error('Invalid qatarTrip structure');
    }
    if (!data.newMonzo || typeof data.newMonzo.total !== 'number') {
      throw new Error('Invalid newMonzo structure');
    }
    if (!data.lastUpdated || typeof data.lastUpdated !== 'string') {
      throw new Error('Invalid lastUpdated');
    }

    // Validate each expense
    data.expenses.forEach((expense: any) => {
      TestAssertions.validateExpense(expense);
    });
  }

  /**
   * Checks for duplicate expenses
   */
  static findDuplicates(expenses: Expense[]): string[] {
    const keys = new Map<string, number>();
    const duplicates: string[] = [];

    for (const expense of expenses) {
      const key = `${expense.date}-${expense.merchant}-${expense.amount}`;
      const count = keys.get(key) || 0;
      keys.set(key, count + 1);

      if (count === 1) {
        duplicates.push(key);
      }
    }

    return duplicates;
  }

  /**
   * Validates date is in Qatar trip range (Feb 1-7, 2026)
   */
  static isQatarTripDate(dateString: string): boolean {
    return dateString >= '2026-02-01' && dateString <= '2026-02-07';
  }

  /**
   * Validates date is after Qatar trip (recent transaction)
   */
  static isRecentTransaction(dateString: string): boolean {
    return dateString > '2026-02-07';
  }
}

/**
 * Wait helpers for better test reliability
 */
export class WaitHelpers {
  /**
   * Waits for API response and returns data
   */
  static async waitForExpensesAPI(page: Page): Promise<ExpenseSummary> {
    const response = await page.waitForResponse(
      res => res.url().includes('/api/expenses') && res.status() === 200,
      { timeout: 10000 }
    );

    return await response.json();
  }

  /**
   * Waits for dashboard to be fully loaded
   */
  static async waitForDashboardLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Expense Reports")', { timeout: 5000 });
  }

  /**
   * Waits for accordion animation to complete
   */
  static async waitForAccordionAnimation(page: Page, delayMs: number = 500): Promise<void> {
    await page.waitForTimeout(delayMs);
  }

  /**
   * Waits for refresh to complete
   */
  static async waitForRefresh(page: Page): Promise<void> {
    await page.waitForResponse(
      res => res.url().includes('/api/expenses') && res.status() === 200,
      { timeout: 5000 }
    );
    await page.waitForTimeout(300); // Allow UI to update
  }
}

/**
 * Date formatting helpers matching the frontend
 */
export class DateHelpers {
  /**
   * Formats date to match frontend display: "Mon, 3 Feb"
   */
  static formatDate(dateString: string, dayString: string): string {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const dayShort = dayString.charAt(0) + dayString.slice(1, 3).toLowerCase();

    return `${dayShort}, ${day} ${month}`;
  }

  /**
   * Gets day name from date
   */
  static getDayName(dateString: string): string {
    const date = new Date(dateString);
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return dayNames[date.getDay()];
  }
}

/**
 * Console error tracker for tests
 */
export class ConsoleTracker {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Starts tracking console messages
   */
  startTracking(page: Page): void {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        this.warnings.push(msg.text());
      }
    });
  }

  /**
   * Gets all tracked errors
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  /**
   * Gets all tracked warnings
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Checks if any errors were logged
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Resets the tracker
   */
  reset(): void {
    this.errors = [];
    this.warnings = [];
  }
}
