'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { Expense, ExpenseSummary } from '@/lib/types';

type ExpenseData = ExpenseSummary & { monzoConnected?: boolean };

// Format date to readable format: "Mon, 3 Feb"
function formatDate(dateString: string, dayString: string): string {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];

  // Use the provided day string (MON, TUE, etc) and format it
  const dayShort = dayString.charAt(0) + dayString.slice(1, 3).toLowerCase();

  return `${dayShort}, ${day} ${month}`;
}

// Animated number counter component
function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // Only animate if value actually changed
    if (prevValueRef.current === value) return;

    setIsAnimating(true);
    const duration = 800; // ms
    const startTime = Date.now();
    const startValue = prevValueRef.current;
    const targetValue = value;
    let animationFrame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
        setIsAnimating(false);
        prevValueRef.current = targetValue;
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value]);

  return (
    <span className={isAnimating ? 'opacity-90' : ''}>
      {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue)}
    </span>
  );
}

// Mobile card view for expenses - amount on left
function ExpenseCard({ expense }: { expense: Expense }) {
  return (
    <div className="border border-[#3f3f3f] bg-[#212121] rounded-lg p-4 hover:bg-[#272727] transition-colors duration-150">
      <div className="flex justify-between items-start mb-3">
        <div className="text-left">
          <div className="font-mono text-[#f1f1f1] font-medium text-xl tabular-nums">
            £{expense.amount.toFixed(2)}
          </div>
          <div className="text-[#aaaaaa] text-xs mt-1">
            {formatDate(expense.date, expense.day)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-[#f1f1f1] text-base">{expense.merchant}</div>
          {expense.location && (
            <div className="text-[#aaaaaa] text-xs mt-1">
              {expense.location}
            </div>
          )}
        </div>
      </div>
      {expense.expenseType && (
        <div className="text-[#aaaaaa] text-xs">
          {expense.expenseType}
        </div>
      )}
    </div>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="border-b border-[#3f3f3f] pb-6 space-y-3">
          <div className="h-8 sm:h-10 bg-[#212121] rounded-lg w-48 sm:w-64 animate-pulse"></div>
          <div className="h-4 bg-[#212121] rounded w-full sm:w-96 animate-pulse"></div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-[#3f3f3f] bg-[#212121] rounded-lg p-4 sm:p-6 space-y-3">
              <div className="h-4 bg-[#272727] rounded w-24 animate-pulse"></div>
              <div className="h-8 bg-[#272727] rounded w-32 animate-pulse"></div>
              <div className="h-3 bg-[#272727] rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="border border-[#3f3f3f] bg-[#212121] rounded-lg p-4 sm:p-6 space-y-4">
          <div className="h-6 bg-[#272727] rounded w-48 animate-pulse"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-[#272727] rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ showConnect }: { showConnect?: boolean }) {
  if (showConnect) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4 sm:p-8">
        <div className="text-center space-y-6">
          <div className="text-5xl sm:text-6xl">🏦</div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#f1f1f1] mb-2">Connect your Monzo account</h2>
            <p className="text-[#aaaaaa] text-sm sm:text-base mb-6">
              Link your Monzo bank to automatically track your expenses.
            </p>
          </div>
          <a
            href="/api/monzo-oauth/setup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#f1f1f1] text-[#0f0f0f] hover:bg-[#d4d4d4] transition-colors font-medium text-base"
          >
            Connect with Monzo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4 sm:p-8">
      <div className="text-center space-y-4">
        <div className="text-5xl sm:text-6xl">📊</div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#f1f1f1] mb-2">No expenses found</h2>
          <p className="text-[#aaaaaa] text-sm sm:text-base">
            Your expense dashboard is ready. Add expenses to get started.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monzoConnected, setMonzoConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Show more state
  const [showAllWorkLunches, setShowAllWorkLunches] = useState(false);
  const [showAllQatar, setShowAllQatar] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/auth/disconnect', { method: 'POST' });
      setMonzoConnected(false);
      setData(null);
    } catch {
      // ignore
    }
    setDisconnecting(false);
  };

  const fetchData = async (showLoading = true, includeMonzo = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);

      const response = await fetch(`/api/expenses?includeMonzo=${includeMonzo}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const json = await response.json();

      setMonzoConnected(json.monzoConnected === true);
      setData(json);
      setError(null);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Phase 1: Show CSV data instantly (no Monzo call)
    fetchData(true, false).then(() => {
      // Phase 2: Fetch Monzo data in background
      fetchData(false, true);
    });

    // Auto-refresh every 5 minutes, but pause when tab is hidden (Page Visibility API)
    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => fetchData(false, true), 5 * 60 * 1000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Tab hidden, pausing auto-refresh');
        stopPolling();
      } else {
        console.log('Tab visible, resuming auto-refresh');
        // Fetch immediately when tab becomes visible again
        fetchData(false, true);
        startPolling();
      }
    };

    // Start initial polling
    startPolling();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4 sm:p-8">
        <div className="text-center space-y-4">
          <div className="text-4xl sm:text-5xl">⚠️</div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#f1f1f1] mb-2">Failed to load expenses</h2>
            <p className="text-[#aaaaaa] mb-4 text-sm sm:text-base">{error}</p>
          </div>
          <Button
            onClick={() => fetchData()}
            className="bg-[#f1f1f1] text-[#0f0f0f] hover:bg-[#aaaaaa] transition-all h-11 px-6"
            style={{ transitionDuration: 'var(--duration-base)' }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.expenses.length === 0) {
    return <EmptyState showConnect={monzoConnected === false} />;
  }

  const lastUpdate = data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : '';

  // Separate expenses by category
  // All work lunches except Qatar trip dates
  const workLunches = data?.expenses.filter(e => {
    // All work lunches except Qatar trip dates
    return !(e.date >= '2026-02-01' && e.date <= '2026-02-07');
  }) || [];

  // Recent transactions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const recentTransactions = data?.expenses.filter(e => {
    return e.date >= thirtyDaysAgoStr;
  }) || [];

  // Qatar Trip expenses (Feb 1-7, 2026)
  const qatarTrip = data?.expenses.filter(e => {
    return e.date >= '2026-02-01' && e.date <= '2026-02-07';
  }) || [];

  // Calculate totals for each section
  const workLunchesTotal = workLunches.reduce((sum, e) => sum + e.amount, 0);
  const recentTransactionsTotal = recentTransactions.reduce((sum, e) => sum + e.amount, 0);
  const qatarTripTotal = qatarTrip.reduce((sum, e) => sum + e.amount, 0);

  // Show limited items
  const INITIAL_SHOW = 5;
  const displayedWorkLunches = showAllWorkLunches ? workLunches : workLunches.slice(0, INITIAL_SHOW);
  const displayedQatar = showAllQatar ? qatarTrip : qatarTrip.slice(0, INITIAL_SHOW);

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="border-b border-[#3f3f3f] pb-4 sm:pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#f1f1f1] tracking-tight">
              Expense Reports
            </h1>
            <p className="text-[#aaaaaa] text-sm sm:text-base">
              Real-time lunch tracking & business trips
            </p>
            <button
              onClick={() => fetchData(false)}
              disabled={refreshing}
              className="flex items-center gap-2 group cursor-pointer disabled:cursor-default"
              aria-label={refreshing ? 'Syncing with Monzo' : 'Click to refresh'}
            >
              <svg
                className={`w-3.5 h-3.5 text-[#717171] group-hover:text-[#f1f1f1] transition-all ${refreshing ? 'animate-spin' : ''}`}
                style={{ transitionDuration: 'var(--duration-base)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <p className="text-xs sm:text-sm text-[#aaaaaa] group-hover:text-[#f1f1f1] transition-colors" style={{ transitionDuration: 'var(--duration-base)' }}>
                Last updated: {lastUpdate}
              </p>
              {monzoConnected === true && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#4ade80]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse"></span>
                  Monzo Connected
                </span>
              )}
              {monzoConnected === false && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#f87171]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]"></span>
                  Monzo Disconnected
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Disconnected Banner */}
        {monzoConnected === false && (
          <div className="border border-[#4a2d2d] bg-[#2a1a1a] rounded-lg p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="text-2xl sm:text-3xl">⚠️</div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#f87171] mb-1">
                    Monzo Connection Lost
                  </h3>
                  <p className="text-[#aaaaaa] text-sm sm:text-base">
                    Your Monzo connection has expired. Recent transactions from Monzo won't appear until you reconnect.
                  </p>
                </div>
                <a
                  href="/api/monzo-oauth/setup"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f1f1f1] text-[#0f0f0f] hover:bg-[#d4d4d4] transition-colors font-medium text-sm"
                >
                  Reconnect Monzo
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border-[#3f3f3f] bg-[#212121] group hover:border-[#717171] transition-all" style={{ transitionDuration: 'var(--duration-base)' }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-[#aaaaaa] text-xs sm:text-sm">
                Total Expenses
              </CardDescription>
              <CardTitle
                className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] tabular-nums group-hover:scale-105 transition-transform origin-left"
                style={{
                  transitionDuration: 'var(--duration-base)',
                  transitionTimingFunction: 'var(--ease-out-quart)'
                }}
              >
                £<AnimatedNumber value={data?.total || 0} />
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums text-xs sm:text-sm">
                {data?.count} items
              </p>
            </CardHeader>
          </Card>

          <Card className="border-[#3f3f3f] bg-[#212121] group hover:border-[#717171] transition-all" style={{ transitionDuration: 'var(--duration-base)' }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-[#aaaaaa] text-xs sm:text-sm">
                Work Lunches
              </CardDescription>
              <CardTitle
                className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] tabular-nums group-hover:scale-105 transition-transform origin-left"
                style={{
                  transitionDuration: 'var(--duration-base)',
                  transitionTimingFunction: 'var(--ease-out-quart)'
                }}
              >
                £<AnimatedNumber value={workLunchesTotal} />
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums text-xs sm:text-sm">
                {workLunches.length} items
              </p>
            </CardHeader>
          </Card>

          <Card className="border-[#3f3f3f] bg-[#212121] group hover:border-[#717171] transition-all sm:col-span-2 lg:col-span-1" style={{ transitionDuration: 'var(--duration-base)' }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-[#aaaaaa] text-xs sm:text-sm">
                Recent Transactions (30d)
              </CardDescription>
              <CardTitle
                className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] tabular-nums group-hover:scale-105 transition-transform origin-left"
                style={{
                  transitionDuration: 'var(--duration-base)',
                  transitionTimingFunction: 'var(--ease-out-quart)'
                }}
              >
                £<AnimatedNumber value={recentTransactionsTotal} />
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums text-xs sm:text-sm">
                {recentTransactions.length} items
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Expense Sections with Accordions */}
        <Accordion type="multiple" defaultValue={['work-lunches']} className="space-y-3 sm:space-y-4">

          {/* Work Lunches Section */}
          <AccordionItem
            value="work-lunches"
            className="border border-[#3f3f3f] rounded-lg bg-[#212121] overflow-hidden transition-all hover:border-[#717171]"
            style={{ transitionDuration: 'var(--duration-base)' }}
          >
            <AccordionTrigger
              className="hover:no-underline hover:bg-[#272727]/50 transition-colors p-4 sm:p-6 min-h-[44px]"
              style={{ transitionDuration: 'var(--duration-base)' }}
            >
              <div className="text-left w-full">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#f1f1f1]">
                  Work Lunches
                </h2>
                <p className="text-[#aaaaaa] text-xs sm:text-sm mt-1">
                  {workLunches.length} items · Kings Cross · £{workLunchesTotal.toFixed(2)}
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Mobile: Card View */}
              <div className="md:hidden space-y-3">
                {displayedWorkLunches.map((expense, idx) => (
                  <ExpenseCard key={idx} expense={expense} />
                ))}
              </div>

              {/* Desktop: Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#3f3f3f]/50 hover:bg-[#272727]">
                      <TableHead className="text-[#f1f1f1] font-bold">Date</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Merchant</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Amount</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedWorkLunches.map((expense, idx) => (
                      <TableRow
                        key={idx}
                        className="border-[#3f3f3f] hover:bg-[#272727] transition-colors"
                        style={{
                          transitionDuration: 'var(--duration-fast)',
                          animation: `fadeIn ${300 + idx * 50}ms var(--ease-out-quart) backwards`
                        }}
                      >
                        <TableCell className="text-[#f1f1f1] text-sm">
                          {formatDate(expense.date, expense.day)}
                        </TableCell>
                        <TableCell className="font-medium text-[#f1f1f1]">{expense.merchant}</TableCell>
                        <TableCell className="font-mono font-medium text-[#f1f1f1] tabular-nums">
                          £{expense.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-[#aaaaaa] text-sm">
                          {expense.location}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {workLunches.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAllWorkLunches(!showAllWorkLunches)}
                  className="w-full text-center text-[#f1f1f1] hover:text-[#ffffff] transition-colors mt-4 py-3 min-h-[44px]"
                  style={{
                    fontSize: 'var(--text-sm)',
                    transitionDuration: 'var(--duration-base)'
                  }}
                  aria-expanded={showAllWorkLunches}
                  aria-label={showAllWorkLunches ? 'Show less work lunches' : `Show ${workLunches.length - INITIAL_SHOW} more work lunches`}
                >
                  {showAllWorkLunches ? 'Show Less' : `Show ${workLunches.length - INITIAL_SHOW} More`}
                </button>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Qatar Trip Section */}
          <AccordionItem
            value="qatar-trip"
            className="border border-[#3f3f3f] rounded-lg bg-[#212121] overflow-hidden transition-all hover:border-[#717171]"
            style={{ transitionDuration: 'var(--duration-base)' }}
          >
            <AccordionTrigger
              className="hover:no-underline hover:bg-[#272727]/50 transition-colors p-4 sm:p-6 min-h-[44px]"
              style={{ transitionDuration: 'var(--duration-base)' }}
            >
              <div className="text-left w-full">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#f1f1f1]">
                  Qatar Business Trip
                </h2>
                <p className="text-[#aaaaaa] text-xs sm:text-sm mt-1">
                  {qatarTrip.length} items · Feb 1-7, 2026 · £{qatarTripTotal.toFixed(2)}
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Mobile: Card View */}
              <div className="md:hidden space-y-3">
                {displayedQatar.map((expense, idx) => (
                  <ExpenseCard key={idx} expense={expense} />
                ))}
              </div>

              {/* Desktop: Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#3f3f3f]/50 hover:bg-[#272727]">
                      <TableHead className="text-[#f1f1f1] font-bold">Date</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Merchant</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Amount</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Category</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedQatar.map((expense, idx) => (
                      <TableRow
                        key={idx}
                        className="border-[#3f3f3f] hover:bg-[#272727] transition-colors"
                        style={{
                          transitionDuration: 'var(--duration-fast)',
                          animation: `fadeIn ${300 + idx * 50}ms var(--ease-out-quart) backwards`
                        }}
                      >
                        <TableCell className="text-[#f1f1f1] text-sm">
                          {formatDate(expense.date, expense.day)}
                        </TableCell>
                        <TableCell className="font-medium text-[#f1f1f1]">{expense.merchant}</TableCell>
                        <TableCell className="font-mono font-medium text-[#f1f1f1] tabular-nums">
                          £{expense.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-[#aaaaaa] text-sm">
                          {expense.expenseType}
                        </TableCell>
                        <TableCell className="text-[#aaaaaa] text-sm">
                          {expense.location}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {qatarTrip.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAllQatar(!showAllQatar)}
                  className="w-full text-center text-[#f1f1f1] hover:text-[#ffffff] transition-colors mt-4 py-3 min-h-[44px]"
                  style={{
                    fontSize: 'var(--text-sm)',
                    transitionDuration: 'var(--duration-base)'
                  }}
                  aria-expanded={showAllQatar}
                  aria-label={showAllQatar ? 'Show less Qatar expenses' : `Show ${qatarTrip.length - INITIAL_SHOW} more Qatar expenses`}
                >
                  {showAllQatar ? 'Show Less' : `Show ${qatarTrip.length - INITIAL_SHOW} More`}
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer */}
        <div className="border-t border-[#3f3f3f] pt-6 mt-8 flex items-center justify-between">
          <p className="text-xs text-[#aaaaaa]">
            Designed and developed by Furquan Ahmad
          </p>
          {monzoConnected === true && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={disconnecting}
                  className="text-xs text-[#717171] hover:text-[#aaaaaa] transition-colors cursor-pointer"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect Monzo'}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Disconnect Monzo?</AlertDialogTitle>
                <AlertDialogDescription>
                  You&apos;ll need to re-authorize with Monzo to reconnect.
                </AlertDialogDescription>
                <div className="flex justify-end gap-3 mt-4">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect}>
                    Disconnect
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {monzoConnected === false && (
            <a
              href="/api/monzo-oauth/setup"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#f1f1f1] text-[#0f0f0f] hover:bg-[#d4d4d4] transition-colors font-medium"
            >
              Connect Monzo
            </a>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
