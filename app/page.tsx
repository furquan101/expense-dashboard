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
import { BarChart2 } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function getYearMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function MarkCompleteModal({
  open,
  availableMonths,
  completedMonths,
  onConfirm,
  onClose,
}: {
  open: boolean;
  availableMonths: string[];
  completedMonths: Set<string>;
  onConfirm: (months: Set<string>) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(completedMonths));

  useEffect(() => {
    if (open) setSelected(new Set(completedMonths));
  }, [open, completedMonths]);

  if (!open) return null;

  const toggle = (ym: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym);
      else next.add(ym);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a1a] border border-[#3f3f3f] rounded-xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[#f1f1f1] font-bold text-lg mb-1">Mark as Completed</h3>
        <p className="text-[#717171] text-sm mb-5">Select months you&apos;ve submitted expenses for.</p>

        <div className="space-y-2 mb-6">
          {availableMonths.map(ym => {
            const done = selected.has(ym);
            return (
              <button
                key={ym}
                onClick={() => toggle(ym)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  done
                    ? 'border-[#4ade80]/40 bg-[#4ade80]/10 text-[#4ade80]'
                    : 'border-[#3f3f3f] bg-[#212121] text-[#aaaaaa] hover:border-[#717171] hover:text-[#f1f1f1]'
                }`}
                style={{ transitionDuration: '150ms' }}
              >
                <span>{formatYearMonth(ym)}</span>
                {done && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#3f3f3f] text-[#aaaaaa] text-sm hover:border-[#717171] hover:text-[#f1f1f1] transition-all"
            style={{ transitionDuration: '150ms' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#f1f1f1] text-[#0f0f0f] text-sm font-medium hover:bg-[#d4d4d4] transition-all"
            style={{ transitionDuration: '150ms' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

type ExpenseData = ExpenseSummary & { monzoConnected?: boolean; scaRequired?: boolean };

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
function ExpenseCard({ expense, completed }: { expense: Expense; completed?: boolean }) {
  return (
    <div className={`border border-[#3f3f3f] bg-[#212121] rounded-lg p-4 hover:bg-[#272727] transition-colors duration-150 ${completed ? 'opacity-40' : ''}`}>
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

// Analytics line chart modal
function AnalyticsModal({
  open,
  expenses,
  onClose,
}: {
  open: boolean;
  expenses: Expense[];
  onClose: () => void;
}) {
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('month');

  const chartData = useMemo(() => {
    if (!expenses.length) return [];
    const buckets: Record<string, number> = {};

    for (const e of expenses) {
      let key: string;
      if (groupBy === 'month') {
        key = e.date.substring(0, 7);
      } else {
        // ISO week: find Monday of that week
        const d = new Date(e.date);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1);
        key = d.toISOString().split('T')[0];
      }
      buckets[key] = (buckets[key] || 0) + e.amount;
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => ({ key, total: parseFloat(total.toFixed(2)) }));
  }, [expenses, groupBy]);

  if (!open) return null;

  const formatLabel = (key: string) => {
    if (groupBy === 'month') {
      const [y, m] = key.split('-');
      return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m) - 1] + ' ' + y.slice(2);
    }
    const d = new Date(key);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a1a] border border-[#3f3f3f] rounded-xl p-6 w-full max-w-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[#f1f1f1] font-bold text-lg">Spending Analytics</h3>
            <p className="text-[#717171] text-sm mt-0.5">Expenses over time</p>
          </div>
          <div className="flex items-center gap-1 bg-[#212121] border border-[#3f3f3f] rounded-lg p-1">
            {(['week', 'month'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  groupBy === g
                    ? 'bg-[#f1f1f1] text-[#0f0f0f]'
                    : 'text-[#717171] hover:text-[#aaaaaa]'
                }`}
                style={{ transitionDuration: '150ms' }}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-[#717171] text-sm">No data</div>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f1f1f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f1f1f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f3f" vertical={false} />
                <XAxis
                  dataKey="key"
                  tickFormatter={formatLabel}
                  tick={{ fill: '#717171', fontSize: 11 }}
                  axisLine={{ stroke: '#3f3f3f' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => `£${v}`}
                  tick={{ fill: '#717171', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1a1a',
                    border: '1px solid #3f3f3f',
                    borderRadius: '8px',
                    color: '#f1f1f1',
                    fontSize: 13,
                  }}
                  formatter={(value) => [`£${(value as number).toFixed(2)}`, 'Spent']}
                  labelFormatter={(label) => formatLabel(label as string)}
                  cursor={{ stroke: '#717171', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#f1f1f1"
                  strokeWidth={2}
                  fill="url(#analyticsGrad)"
                  dot={{ fill: '#0f0f0f', stroke: '#f1f1f1', strokeWidth: 2, r: 4 }}
                  activeDot={{ fill: '#f1f1f1', stroke: '#0f0f0f', strokeWidth: 2, r: 5 }}
                  isAnimationActive={true}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2.5 rounded-lg border border-[#3f3f3f] text-[#aaaaaa] text-sm hover:border-[#717171] hover:text-[#f1f1f1] transition-all"
          style={{ transitionDuration: '150ms' }}
        >
          Close
        </button>
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
  const [scaRequired, setScaRequired] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Show more state
  const [showAllWorkLunches, setShowAllWorkLunches] = useState(false);
  const [showAllQatar, setShowAllQatar] = useState(false);

  // Completed months — persisted in localStorage
  const [completedMonths, setCompletedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const s = localStorage.getItem('completedMonths');
      if (s) setCompletedMonths(new Set(JSON.parse(s)));
    } catch { /* ignore */ }
  }, []);

  const [markModal, setMarkModal] = useState<{ open: boolean; section: 'work' | 'qatar' } | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('completedMonths', JSON.stringify([...completedMonths]));
    } catch { /* ignore */ }
  }, [completedMonths]);

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
      setScaRequired(json.scaRequired === true);
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
  const workLunches = data.expenses.filter(e => !(e.date >= '2026-02-01' && e.date <= '2026-02-07'));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Recent transactions (last 30 days)
  const recentTransactions = data.expenses.filter(e => e.date >= thirtyDaysAgoStr);

  // Qatar Trip expenses (Feb 1-7, 2026)
  const qatarTrip = data.expenses.filter(e => e.date >= '2026-02-01' && e.date <= '2026-02-07');

  // Calculate totals for each section
  const workLunchesTotal = workLunches.reduce((sum, e) => sum + e.amount, 0);
  const recentTransactionsTotal = recentTransactions.reduce((sum, e) => sum + e.amount, 0);
  const qatarTripTotal = qatarTrip.reduce((sum, e) => sum + e.amount, 0);

  // Show limited items
  const INITIAL_SHOW = 5;
  // Unique months in each section (sorted ascending)
  const workLunchMonths = [...new Set(workLunches.map(e => getYearMonth(e.date)))].sort();
  const qatarMonths = [...new Set(qatarTrip.map(e => getYearMonth(e.date)))].sort();
  const workCompletedMonths = new Set([...completedMonths].filter(m => workLunchMonths.includes(m)));
  const qatarCompletedMonths = new Set([...completedMonths].filter(m => qatarMonths.includes(m)));

  const displayedWorkLunches = showAllWorkLunches ? workLunches : workLunches.slice(0, INITIAL_SHOW);
  const displayedQatar = showAllQatar ? qatarTrip : qatarTrip.slice(0, INITIAL_SHOW);

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="border-b border-[#3f3f3f] pb-4 sm:pb-6">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#f1f1f1] tracking-tight">
                  Expense Reports
                </h1>
                <p className="text-[#aaaaaa] text-sm sm:text-base">
                  Real-time lunch tracking & business trips
                </p>
              </div>
              <button
                onClick={() => setAnalyticsOpen(true)}
                className="p-2 rounded-lg border border-[#3f3f3f] text-[#717171] hover:border-[#717171] hover:text-[#f1f1f1] transition-all mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#717171]"
                style={{ transitionDuration: '150ms' }}
                aria-label="Open analytics"
              >
                <BarChart2 className="w-5 h-5" />
              </button>
            </div>
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
              {monzoConnected === false && scaRequired && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#facc15]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-pulse"></span>
                  Monzo Re-auth Required
                </span>
              )}
              {monzoConnected === false && !scaRequired && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#f87171]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]"></span>
                  Monzo Disconnected
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SCA Re-auth Banner */}
        {scaRequired && (
          <div className="border border-[#4a3f1a] bg-[#2a2210] rounded-lg p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="text-2xl sm:text-3xl">🔐</div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#facc15] mb-1">
                    Monzo Re-authentication Required
                  </h3>
                  <p className="text-[#aaaaaa] text-sm sm:text-base">
                    Monzo's Strong Customer Authentication (SCA) has expired. Your token is valid but transaction access is blocked — recent transactions won't appear until you re-authenticate.
                  </p>
                </div>
                <a
                  href="/api/monzo-oauth/setup"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#facc15] text-[#0f0f0f] hover:bg-[#eab308] transition-colors font-medium text-sm"
                >
                  Re-authenticate with Monzo
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Disconnected Banner */}
        {monzoConnected === false && !scaRequired && (
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
              <div className="flex items-center justify-between w-full pr-2">
                <div className="text-left">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#f1f1f1]">
                    Work Lunches
                  </h2>
                  <p className="text-[#aaaaaa] text-xs sm:text-sm mt-1">
                    {workLunches.length} items · Kings Cross · £{workLunchesTotal.toFixed(2)}
                  </p>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setMarkModal({ open: true, section: 'work' }); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setMarkModal({ open: true, section: 'work' }); } }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#717171] ${
                    workCompletedMonths.size > 0
                      ? 'border-[#4ade80]/40 bg-[#4ade80]/10 text-[#4ade80]'
                      : 'border-[#3f3f3f] text-[#aaaaaa] hover:border-[#717171] hover:text-[#f1f1f1]'
                  }`}
                  style={{ transitionDuration: '150ms' }}
                >
                  {workCompletedMonths.size > 0 ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Completed
                    </>
                  ) : 'Mark Complete'}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Mobile: Card View */}
              <div className="md:hidden space-y-3">
                {displayedWorkLunches.map((expense, idx) => (
                  <ExpenseCard
                    key={`${expense.date}-${expense.merchant}-${expense.amount}`}
                    expense={expense}
                    completed={completedMonths.has(getYearMonth(expense.date))}
                  />
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
                        key={`${expense.date}-${expense.merchant}-${expense.amount}`}
                        className={`border-[#3f3f3f] hover:bg-[#272727] transition-colors ${completedMonths.has(getYearMonth(expense.date)) ? 'opacity-40' : ''}`}
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
              <div className="flex items-center justify-between w-full pr-2">
                <div className="text-left">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#f1f1f1]">
                    Qatar Business Trip
                  </h2>
                  <p className="text-[#aaaaaa] text-xs sm:text-sm mt-1">
                    {qatarTrip.length} items · Feb 1-7, 2026 · £{qatarTripTotal.toFixed(2)}
                  </p>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setMarkModal({ open: true, section: 'qatar' }); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setMarkModal({ open: true, section: 'qatar' }); } }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#717171] ${
                    qatarCompletedMonths.size > 0
                      ? 'border-[#4ade80]/40 bg-[#4ade80]/10 text-[#4ade80]'
                      : 'border-[#3f3f3f] text-[#aaaaaa] hover:border-[#717171] hover:text-[#f1f1f1]'
                  }`}
                  style={{ transitionDuration: '150ms' }}
                >
                  {qatarCompletedMonths.size > 0 ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Completed
                    </>
                  ) : 'Mark Complete'}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Mobile: Card View */}
              <div className="md:hidden space-y-3">
                {displayedQatar.map((expense, idx) => (
                  <ExpenseCard
                    key={`${expense.date}-${expense.merchant}-${expense.amount}`}
                    expense={expense}
                    completed={completedMonths.has(getYearMonth(expense.date))}
                  />
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
                        key={`${expense.date}-${expense.merchant}-${expense.amount}`}
                        className={`border-[#3f3f3f] hover:bg-[#272727] transition-colors ${completedMonths.has(getYearMonth(expense.date)) ? 'opacity-40' : ''}`}
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

        {/* Mark Complete Modal */}
        <MarkCompleteModal
          open={markModal?.open === true}
          availableMonths={markModal?.section === 'work' ? workLunchMonths : qatarMonths}
          completedMonths={
            new Set([...completedMonths].filter(m =>
              (markModal?.section === 'work' ? workLunchMonths : qatarMonths).includes(m)
            ))
          }
          onConfirm={(selected) => {
            setCompletedMonths(prev => {
              const next = new Set(prev);
              const sectionMonths = markModal?.section === 'work' ? workLunchMonths : qatarMonths;
              sectionMonths.forEach(m => next.delete(m));
              selected.forEach(m => next.add(m));
              return next;
            });
            setMarkModal(null);
          }}
          onClose={() => setMarkModal(null)}
        />

        {/* Analytics Modal */}
        <AnalyticsModal
          open={analyticsOpen}
          expenses={data?.expenses || []}
          onClose={() => setAnalyticsOpen(false)}
        />
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
