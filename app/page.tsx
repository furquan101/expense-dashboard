'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Expense {
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

interface ExpenseData {
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
  newMonzo?: {
    total: number;
    count: number;
  };
  lastUpdated: string;
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

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-8" style={{ padding: 'var(--space-xl)' }}>
      <div className="max-w-7xl mx-auto space-y-6" style={{ gap: 'var(--space-xl)' }}>
        {/* Header skeleton */}
        <div className="border-b border-[#3f3f3f] pb-6 space-y-3">
          <div className="h-10 bg-[#212121] rounded-lg w-64 animate-pulse"></div>
          <div className="h-4 bg-[#212121] rounded w-96 animate-pulse"></div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gap: 'var(--space-lg)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-[#3f3f3f] bg-[#212121] rounded-lg p-6 space-y-3">
              <div className="h-4 bg-[#272727] rounded w-24 animate-pulse"></div>
              <div className="h-8 bg-[#272727] rounded w-32 animate-pulse"></div>
              <div className="h-3 bg-[#272727] rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="border border-[#3f3f3f] bg-[#212121] rounded-lg p-6 space-y-4">
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
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
      <div className="text-center space-y-4" style={{ gap: 'var(--space-lg)' }}>
        <div className="text-6xl">📊</div>
        <div>
          <h2 className="text-2xl font-bold text-[#f1f1f1] mb-2">No expenses found</h2>
          <p className="text-[#aaaaaa]">
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
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="text-center space-y-4" style={{ gap: 'var(--space-lg)' }}>
          <div className="text-5xl">⚠️</div>
          <div>
            <h2 className="text-xl font-bold text-[#f1f1f1] mb-2">Failed to load expenses</h2>
            <p className="text-[#aaaaaa] mb-4">{error}</p>
          </div>
          <Button
            onClick={() => fetchData()}
            className="bg-[#f1f1f1] text-[#0f0f0f] hover:bg-[#aaaaaa] transition-all duration-200"
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

  // Show limited items
  const INITIAL_SHOW = 5;
  const displayedWorkLunches = showAllWorkLunches ? workLunches : workLunches.slice(0, INITIAL_SHOW);
  const displayedQatar = showAllQatar ? qatarTrip : qatarTrip.slice(0, INITIAL_SHOW);
  const displayedMonzo = showAllMonzo ? recentMonzo : recentMonzo.slice(0, INITIAL_SHOW);

  return (
    <div className="min-h-screen bg-[#0f0f0f]" style={{ padding: 'var(--space-xl)' }}>
      <div className="max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        {/* Header */}
        <div className="border-b border-[#3f3f3f] flex justify-between items-start" style={{ paddingBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <h1
              className="font-bold text-[#f1f1f1] tracking-tight"
              style={{ fontSize: 'var(--text-4xl)', lineHeight: '1.1' }}
            >
              Expense Reports
            </h1>
            <p className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-base)' }}>
              Real-time lunch tracking & business trips · Live sync with Monzo
            </p>
            <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                <div
                  className={`w-2 h-2 rounded-full transition-all ${refreshing ? 'bg-[#f1f1f1] animate-pulse' : 'bg-[#717171]'}`}
                  style={{ transitionDuration: 'var(--duration-base)' }}
                  aria-label={refreshing ? 'Syncing' : 'Idle'}
                ></div>
                <p className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                  Last updated: {lastUpdate}
                </p>
              </div>
            </div>
          </div>
          <div className="relative">
            <Button
              onClick={() => fetchData(false)}
              disabled={refreshing}
              className="bg-[#f1f1f1] text-[#0f0f0f] hover:bg-[#aaaaaa] font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
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

        {/* Stats Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ gap: 'var(--space-lg)' }}
        >
          <Card className="border-[#3f3f3f] bg-[#212121] group hover:border-[#717171] transition-all" style={{ transitionDuration: 'var(--duration-base)' }}>
            <CardHeader style={{ paddingBottom: 'var(--space-md)' }}>
              <CardDescription className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                Total Expenses
              </CardDescription>
              <CardTitle
                className="font-bold text-[#f1f1f1] tabular-nums group-hover:scale-105 transition-transform origin-left"
                style={{
                  fontSize: 'var(--text-3xl)',
                  transitionDuration: 'var(--duration-base)',
                  transitionTimingFunction: 'var(--ease-out-quart)'
                }}
              >
                £<AnimatedNumber value={data?.total || 0} />
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
                {data?.count} items
              </p>
            </CardHeader>
          </Card>

          <Card className="border-[#3f3f3f] bg-[#212121] group hover:border-[#717171] transition-all" style={{ transitionDuration: 'var(--duration-base)' }}>
            <CardHeader style={{ paddingBottom: 'var(--space-md)' }}>
              <CardDescription className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                Work Lunches
              </CardDescription>
              <CardTitle
                className="font-bold text-[#f1f1f1] tabular-nums group-hover:scale-105 transition-transform origin-left"
                style={{
                  fontSize: 'var(--text-3xl)',
                  transitionDuration: 'var(--duration-base)',
                  transitionTimingFunction: 'var(--ease-out-quart)'
                }}
              >
                £<AnimatedNumber value={data?.workLunches.total || 0} />
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
                {data?.workLunches.count} items
              </p>
            </CardHeader>
          </Card>

          <Card className="border-[#3f3f3f] bg-[#212121] group hover:border-[#717171] transition-all" style={{ transitionDuration: 'var(--duration-base)' }}>
            <CardHeader style={{ paddingBottom: 'var(--space-md)' }}>
              <CardDescription className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                Qatar Trip
              </CardDescription>
              <CardTitle
                className="font-bold text-[#f1f1f1] tabular-nums group-hover:scale-105 transition-transform origin-left"
                style={{
                  fontSize: 'var(--text-3xl)',
                  transitionDuration: 'var(--duration-base)',
                  transitionTimingFunction: 'var(--ease-out-quart)'
                }}
              >
                £<AnimatedNumber value={data?.qatarTrip.total || 0} />
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
                {data?.qatarTrip.count} items
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Expense Sections with Accordions */}
        <Accordion type="multiple" defaultValue={['work-lunches', 'qatar-trip']} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* Recent Monzo Transactions */}
          {recentMonzo.length > 0 && (
            <AccordionItem
              value="recent-monzo"
              className="border border-[#3f3f3f] rounded-lg bg-[#212121] overflow-hidden transition-all hover:border-[#717171]"
              style={{ transitionDuration: 'var(--duration-base)' }}
            >
              <AccordionTrigger
                className="hover:no-underline hover:bg-[#272727]/50 transition-colors"
                style={{
                  padding: 'var(--space-lg)',
                  transitionDuration: 'var(--duration-base)'
                }}
              >
                <div className="flex items-center justify-between w-full pr-4">
                  <div>
                    <h2 className="font-bold text-[#f1f1f1]" style={{ fontSize: 'var(--text-2xl)' }}>
                      Recent Transactions
                    </h2>
                    <p className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
                      Latest from Monzo API
                    </p>
                  </div>
                  <div className="text-[#f1f1f1] font-bold tabular-nums">{recentMonzo.length} items</div>
                </div>
              </AccordionTrigger>
              <AccordionContent style={{ padding: 'var(--space-lg)', paddingTop: 0 }}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#3f3f3f]/50 hover:bg-[#272727]">
                      <TableHead className="text-[#f1f1f1] font-bold">Date</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Day</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Merchant</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Category</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Location</TableHead>
                      <TableHead className="text-right text-[#f1f1f1] font-bold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedMonzo.map((expense, idx) => (
                      <TableRow
                        key={idx}
                        className="border-[#3f3f3f] hover:bg-[#272727] transition-colors"
                        style={{
                          transitionDuration: 'var(--duration-fast)',
                          animation: `fadeIn ${300 + idx * 50}ms var(--ease-out-quart) backwards`
                        }}
                      >
                        <TableCell className="font-mono text-[#f1f1f1]" style={{ fontSize: 'var(--text-sm)' }}>
                          {expense.date}
                        </TableCell>
                        <TableCell className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                          {expense.day}
                        </TableCell>
                        <TableCell className="font-medium text-[#f1f1f1]">{expense.merchant}</TableCell>
                        <TableCell className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                          {expense.expenseType}
                        </TableCell>
                        <TableCell className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                          {expense.location}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[#f1f1f1] tabular-nums">
                          £{expense.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recentMonzo.length > INITIAL_SHOW && (
                  <button
                    onClick={() => setShowAllMonzo(!showAllMonzo)}
                    className="w-full text-center text-[#f1f1f1] hover:text-[#ffffff] transition-colors"
                    style={{
                      marginTop: 'var(--space-lg)',
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
              className="hover:no-underline hover:bg-[#272727]/50 transition-colors"
              style={{
                padding: 'var(--space-lg)',
                transitionDuration: 'var(--duration-base)'
              }}
            >
              <div className="flex items-center justify-between w-full pr-4">
                <div>
                  <h2 className="font-bold text-[#f1f1f1]" style={{ fontSize: 'var(--text-2xl)' }}>
                    Work Lunches
                  </h2>
                  <p className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
                    Office lunch expenses · Kings Cross
                  </p>
                </div>
                <div className="text-[#f1f1f1] font-bold tabular-nums">{workLunches.length} items</div>
              </div>
            </AccordionTrigger>
            <AccordionContent style={{ padding: 'var(--space-lg)', paddingTop: 0 }}>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#3f3f3f]/50 hover:bg-[#272727]">
                    <TableHead className="text-[#f1f1f1] font-bold">Date</TableHead>
                    <TableHead className="text-[#f1f1f1] font-bold">Day</TableHead>
                    <TableHead className="text-[#f1f1f1] font-bold">Merchant</TableHead>
                    <TableHead className="text-[#f1f1f1] font-bold">Location</TableHead>
                    <TableHead className="text-right text-[#f1f1f1] font-bold">Amount</TableHead>
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
                      <TableCell className="font-mono text-[#f1f1f1]" style={{ fontSize: 'var(--text-sm)' }}>
                        {expense.date}
                      </TableCell>
                      <TableCell className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                        {expense.day}
                      </TableCell>
                      <TableCell className="font-medium text-[#f1f1f1]">{expense.merchant}</TableCell>
                      <TableCell className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                        {expense.location}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[#f1f1f1] tabular-nums">
                        £{expense.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {workLunches.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAllWorkLunches(!showAllWorkLunches)}
                  className="w-full text-center text-[#f1f1f1] hover:text-[#ffffff] transition-colors"
                  style={{
                    marginTop: 'var(--space-lg)',
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
              className="hover:no-underline hover:bg-[#272727]/50 transition-colors"
              style={{
                padding: 'var(--space-lg)',
                transitionDuration: 'var(--duration-base)'
              }}
            >
              <div className="flex items-center justify-between w-full pr-4">
                <div>
                  <h2 className="font-bold text-[#f1f1f1]" style={{ fontSize: 'var(--text-2xl)' }}>
                    Qatar Business Trip
                  </h2>
                  <p className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
                    Feb 1-7, 2026 · Hotel, meals, transport
                  </p>
                </div>
                <div className="text-[#f1f1f1] font-bold tabular-nums">{qatarTrip.length} items</div>
              </div>
            </AccordionTrigger>
            <AccordionContent style={{ padding: 'var(--space-lg)', paddingTop: 0 }}>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#3f3f3f]/50 hover:bg-[#272727]">
                    <TableHead className="text-[#f1f1f1] font-bold">Date</TableHead>
                    <TableHead className="text-[#f1f1f1] font-bold">Day</TableHead>
                    <TableHead className="text-[#f1f1f1] font-bold">Merchant</TableHead>
                    <TableHead className="text-[#f1f1f1] font-bold">Category</TableHead>
                    <TableHead className="text-[#f1f1f1] font-bold">Location</TableHead>
                    <TableHead className="text-right text-[#f1f1f1] font-bold">Amount</TableHead>
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
                      <TableCell className="font-mono text-[#f1f1f1]" style={{ fontSize: 'var(--text-sm)' }}>
                        {expense.date}
                      </TableCell>
                      <TableCell className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                        {expense.day}
                      </TableCell>
                      <TableCell className="font-medium text-[#f1f1f1]">{expense.merchant}</TableCell>
                      <TableCell className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                        {expense.expenseType}
                      </TableCell>
                      <TableCell className="text-[#aaaaaa]" style={{ fontSize: 'var(--text-sm)' }}>
                        {expense.location}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[#f1f1f1] tabular-nums">
                        £{expense.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {qatarTrip.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAllQatar(!showAllQatar)}
                  className="w-full text-center text-[#f1f1f1] hover:text-[#ffffff] transition-colors"
                  style={{
                    marginTop: 'var(--space-lg)',
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
