'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Expense, ExpenseSummary } from '@/lib/types';

type ExpenseData = ExpenseSummary;

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
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const duration = 800;
    const steps = 30;
    const stepValue = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setDisplayValue(stepValue * currentStep);

      if (currentStep >= steps) {
        setDisplayValue(value);
        setIsAnimating(false);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
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
function EmptyState() {
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
  const [syncProgress, setSyncProgress] = useState(0);

  // Show more state
  const [showAllWorkLunches, setShowAllWorkLunches] = useState(false);
  const [showAllQatar, setShowAllQatar] = useState(false);
  const [showAllMonzo, setShowAllMonzo] = useState(false);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      setSyncProgress(0);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/expenses?includeMonzo=true');
      if (!response.ok) throw new Error('Failed to fetch data');
      const json = await response.json();

      clearInterval(progressInterval);
      setSyncProgress(100);

      // Small delay to show 100% before hiding
      setTimeout(() => {
        setData(json);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        setSyncProgress(0);
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      setRefreshing(false);
      setSyncProgress(0);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchData(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
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
    return <EmptyState />;
  }

  const lastUpdate = data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : '';

  // Separate expenses by category
  const workLunches = data?.expenses.filter(e => {
    // All work lunches except Qatar trip dates
    return !(e.date >= '2026-02-01' && e.date <= '2026-02-07');
  }) || [];

  const qatarTrip = data?.expenses.filter(e => {
    if (!e.date.startsWith('2026-02')) return false;
    return e.date >= '2026-02-01' && e.date <= '2026-02-07';
  }) || [];

  const recentMonzo = data?.expenses.filter(e => {
    if (e.notes?.includes('Monzo')) return true;
    return e.date > '2026-02-07';
  }) || [];

  // Calculate totals for each section
  const workLunchesTotal = workLunches.reduce((sum, e) => sum + e.amount, 0);
  const qatarTripTotal = qatarTrip.reduce((sum, e) => sum + e.amount, 0);
  const recentMonzoTotal = recentMonzo.reduce((sum, e) => sum + e.amount, 0);

  // Show limited items
  const INITIAL_SHOW = 5;
  const displayedWorkLunches = showAllWorkLunches ? workLunches : workLunches.slice(0, INITIAL_SHOW);
  const displayedQatar = showAllQatar ? qatarTrip : qatarTrip.slice(0, INITIAL_SHOW);
  const displayedMonzo = showAllMonzo ? recentMonzo : recentMonzo.slice(0, INITIAL_SHOW);

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="border-b border-[#3f3f3f] pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-[#f1f1f1] tracking-tight">
                Expense Reports
              </h1>
              <p className="text-[#aaaaaa] text-sm sm:text-base">
                Real-time lunch tracking & business trips
                <span className="hidden sm:inline"> · Live sync with Monzo</span>
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full transition-all ${refreshing ? 'bg-[#f1f1f1] animate-pulse' : 'bg-[#717171]'}`}
                  style={{ transitionDuration: 'var(--duration-base)' }}
                  aria-label={refreshing ? 'Syncing' : 'Idle'}
                ></div>
                <p className="text-xs sm:text-sm text-[#aaaaaa]">
                  Last updated: {lastUpdate}
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-auto">
              <Button
                onClick={() => fetchData(false)}
                disabled={refreshing}
                className="w-full sm:w-auto bg-transparent border border-[#f1f1f1] text-[#f1f1f1] hover:bg-[#f1f1f1]/10 font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 py-3 px-6 text-xs uppercase tracking-wide"
                style={{ transitionDuration: 'var(--duration-base)', transitionTimingFunction: 'var(--ease-out-quart)' }}
                aria-label={refreshing ? 'Syncing with Monzo' : 'Sync with Monzo'}
              >
                {refreshing ? 'Syncing...' : 'Sync Monzo'}
              </Button>
              {syncProgress > 0 && (
                <div
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-[#3f3f3f] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={syncProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-[#f1f1f1] transition-all ease-out"
                    style={{
                      width: `${syncProgress}%`,
                      transitionDuration: 'var(--duration-base)'
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

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
                £<AnimatedNumber value={data?.workLunches.total || 0} />
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums text-xs sm:text-sm">
                {data?.workLunches.count} items
              </p>
            </CardHeader>
          </Card>

          <Card className="border-[#3f3f3f] bg-[#212121] group hover:border-[#717171] transition-all sm:col-span-2 lg:col-span-1" style={{ transitionDuration: 'var(--duration-base)' }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-[#aaaaaa] text-xs sm:text-sm">
                Qatar Trip
              </CardDescription>
              <CardTitle
                className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] tabular-nums group-hover:scale-105 transition-transform origin-left"
                style={{
                  transitionDuration: 'var(--duration-base)',
                  transitionTimingFunction: 'var(--ease-out-quart)'
                }}
              >
                £<AnimatedNumber value={data?.qatarTrip.total || 0} />
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums text-xs sm:text-sm">
                {data?.qatarTrip.count} items
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Expense Sections with Accordions */}
        <Accordion type="multiple" defaultValue={['work-lunches', 'qatar-trip']} className="space-y-3 sm:space-y-4">

          {/* Recent Monzo Transactions */}
          {recentMonzo.length > 0 && (
            <AccordionItem
              value="recent-monzo"
              className="border border-[#3f3f3f] rounded-lg bg-[#212121] overflow-hidden transition-all hover:border-[#717171]"
              style={{ transitionDuration: 'var(--duration-base)' }}
            >
              <AccordionTrigger
                className="hover:no-underline hover:bg-[#272727]/50 transition-colors p-4 sm:p-6 min-h-[44px]"
                style={{ transitionDuration: 'var(--duration-base)' }}
              >
                <div className="text-left w-full">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#f1f1f1]">
                    Recent Transactions
                  </h2>
                  <p className="text-[#aaaaaa] text-xs sm:text-sm mt-1">
                    {recentMonzo.length} items · £{recentMonzoTotal.toFixed(2)}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                {/* Mobile: Card View */}
                <div className="md:hidden space-y-3">
                  {displayedMonzo.map((expense, idx) => (
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
                      {displayedMonzo.map((expense, idx) => {
                        return (
                          <TableRow
                            key={idx}
                            className="border-[#3f3f3f] hover:bg-[#272727] transition-colors"
                            style={{
                              transitionDuration: 'var(--duration-fast)',
                              animation: `fadeIn ${300 + idx * 50}ms var(--ease-out-quart) backwards`
                            }}
                          >
                            <TableCell className="text-sm text-[#f1f1f1]">
                              {formatDate(expense.date, expense.day)}
                            </TableCell>
                            <TableCell className="font-medium text-[#f1f1f1]">
                              {expense.merchant}
                            </TableCell>
                            <TableCell className="font-mono font-medium tabular-nums text-[#f1f1f1]">
                              £{expense.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-[#aaaaaa]">
                              {expense.expenseType}
                            </TableCell>
                            <TableCell className="text-sm text-[#aaaaaa]">
                              {expense.location}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {recentMonzo.length > INITIAL_SHOW && (
                  <button
                    onClick={() => setShowAllMonzo(!showAllMonzo)}
                    className="w-full text-center text-[#f1f1f1] hover:text-[#ffffff] transition-colors mt-4 py-3 min-h-[44px]"
                    style={{
                      fontSize: 'var(--text-sm)',
                      transitionDuration: 'var(--duration-base)'
                    }}
                    aria-expanded={showAllMonzo}
                    aria-label={showAllMonzo ? 'Show less transactions' : `Show ${recentMonzo.length - INITIAL_SHOW} more transactions`}
                  >
                    {showAllMonzo ? 'Show Less' : `Show ${recentMonzo.length - INITIAL_SHOW} More`}
                  </button>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

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
