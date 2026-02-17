'use client';

import { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Expense } from '@/lib/types';

// Sample demo data
const DEMO_DATA = {
  expenses: [
    // Work Lunches
    { date: '2025-12-16', day: 'MON', merchant: 'Pret A Manger', amount: 8.45, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2025-12-17', day: 'TUE', merchant: 'Leon', amount: 9.20, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2025-12-18', day: 'WED', merchant: 'Wasabi', amount: 7.95, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2025-12-19', day: 'THU', merchant: 'EAT.', amount: 8.75, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2025-12-20', day: 'FRI', merchant: 'Itsu', amount: 10.50, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-06', day: 'MON', merchant: 'Pret A Manger', amount: 8.95, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-07', day: 'TUE', merchant: 'Greggs', amount: 6.40, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-08', day: 'WED', merchant: 'Leon', amount: 9.85, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-09', day: 'THU', merchant: 'Wasabi', amount: 8.30, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-10', day: 'FRI', merchant: 'Itsu', amount: 11.20, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-13', day: 'MON', merchant: 'EAT.', amount: 9.15, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-14', day: 'TUE', merchant: 'Pret A Manger', amount: 8.60, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-15', day: 'WED', merchant: 'Leon', amount: 10.05, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-16', day: 'THU', merchant: 'Wasabi', amount: 7.80, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    { date: '2026-01-17', day: 'FRI', merchant: 'Itsu', amount: 10.95, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Work lunch', location: 'Kings Cross', receiptAttached: 'No', notes: '' },
    // Qatar Trip
    { date: '2026-02-01', day: 'SAT', merchant: 'Qatar Airways', amount: 45.00, currency: 'GBP', category: 'eating_out', expenseType: 'Flight Meal', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-01', day: 'SAT', merchant: 'Hamad Airport Duty Free', amount: 22.50, currency: 'GBP', category: 'shopping', expenseType: 'Travel', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-02', day: 'SUN', merchant: 'Souq Waqif Restaurant', amount: 38.75, currency: 'GBP', category: 'eating_out', expenseType: 'Dinner', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-02', day: 'SUN', merchant: 'Café Arabian', amount: 12.30, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-03', day: 'MON', merchant: 'Business Center Café', amount: 8.50, currency: 'GBP', category: 'eating_out', expenseType: 'Coffee', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-03', day: 'MON', merchant: 'Al Mourjan Restaurant', amount: 52.00, currency: 'GBP', category: 'eating_out', expenseType: 'Dinner', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-04', day: 'TUE', merchant: 'Hotel Breakfast', amount: 18.00, currency: 'GBP', category: 'eating_out', expenseType: 'Breakfast', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-04', day: 'TUE', merchant: 'Local Transport', amount: 15.40, currency: 'GBP', category: 'transport', expenseType: 'Transport', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-04', day: 'TUE', merchant: 'Persian Restaurant', amount: 41.20, currency: 'GBP', category: 'eating_out', expenseType: 'Dinner', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-05', day: 'WED', merchant: 'Conference Lunch', amount: 28.90, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-05', day: 'WED', merchant: 'Taxi to Venue', amount: 22.00, currency: 'GBP', category: 'transport', expenseType: 'Transport', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-06', day: 'THU', merchant: 'Shopping Centre Food Court', amount: 16.75, currency: 'GBP', category: 'eating_out', expenseType: 'Lunch', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-06', day: 'THU', merchant: 'Uber to Airport', amount: 35.60, currency: 'GBP', category: 'transport', expenseType: 'Transport', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
    { date: '2026-02-07', day: 'FRI', merchant: 'Airport Lounge', amount: 42.00, currency: 'GBP', category: 'eating_out', expenseType: 'Travel', purpose: 'Business trip', location: 'Doha', receiptAttached: 'No', notes: '' },
  ],
  total: 0,
  count: 0,
  lastUpdated: new Date().toISOString(),
};

DEMO_DATA.total = DEMO_DATA.expenses.reduce((sum, e) => sum + e.amount, 0);
DEMO_DATA.count = DEMO_DATA.expenses.length;

function formatDate(dateString: string, dayString: string): string {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const dayShort = dayString.charAt(0) + dayString.slice(1, 3).toLowerCase();
  return `${dayShort}, ${day} ${month}`;
}

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
            <div className="text-[#aaaaaa] text-xs mt-1">{expense.location}</div>
          )}
        </div>
      </div>
      {expense.expenseType && (
        <div className="text-[#aaaaaa] text-xs">{expense.expenseType}</div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [showAllWorkLunches, setShowAllWorkLunches] = useState(false);
  const [showAllQatar, setShowAllQatar] = useState(false);

  const data = DEMO_DATA;
  const workLunches = data.expenses.filter(e => !(e.date >= '2026-02-01' && e.date <= '2026-02-07'));
  const qatarTrip = data.expenses.filter(e => e.date >= '2026-02-01' && e.date <= '2026-02-07');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentTransactions = data.expenses.filter(e => e.date >= thirtyDaysAgo.toISOString().split('T')[0]);

  const workLunchesTotal = workLunches.reduce((sum, e) => sum + e.amount, 0);
  const recentTransactionsTotal = recentTransactions.reduce((sum, e) => sum + e.amount, 0);
  const qatarTripTotal = qatarTrip.reduce((sum, e) => sum + e.amount, 0);

  const INITIAL_SHOW = 5;
  const displayedWorkLunches = showAllWorkLunches ? workLunches : workLunches.slice(0, INITIAL_SHOW);
  const displayedQatar = showAllQatar ? qatarTrip : qatarTrip.slice(0, INITIAL_SHOW);

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Demo Banner */}
        <div className="bg-[#212121] border border-[#3f3f3f] rounded-lg p-4 text-center">
          <p className="text-[#f1f1f1] font-medium">
            🎭 Demo Mode - Sample data for demonstration
          </p>
          <p className="text-[#aaaaaa] text-sm mt-1">
            <a href="/" className="underline hover:text-[#f1f1f1]">View live dashboard</a>
          </p>
        </div>

        {/* Header */}
        <div className="border-b border-[#3f3f3f] pb-4 sm:pb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#f1f1f1] tracking-tight">
            Expense Reports
          </h1>
          <p className="text-[#aaaaaa] text-sm sm:text-base mt-2">
            Real-time lunch tracking & business trips · Live sync with Monzo
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border-[#3f3f3f] bg-[#212121]">
            <CardHeader className="pb-3">
              <CardDescription className="text-[#aaaaaa] text-xs sm:text-sm">Total Expenses</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] tabular-nums">
                £{data.total.toFixed(2)}
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums text-xs sm:text-sm">{data.count} items</p>
            </CardHeader>
          </Card>

          <Card className="border-[#3f3f3f] bg-[#212121]">
            <CardHeader className="pb-3">
              <CardDescription className="text-[#aaaaaa] text-xs sm:text-sm">Work Lunches</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] tabular-nums">
                £{workLunchesTotal.toFixed(2)}
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums text-xs sm:text-sm">{workLunches.length} items</p>
            </CardHeader>
          </Card>

          <Card className="border-[#3f3f3f] bg-[#212121] sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardDescription className="text-[#aaaaaa] text-xs sm:text-sm">Recent (30d)</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] tabular-nums">
                £{recentTransactionsTotal.toFixed(2)}
              </CardTitle>
              <p className="text-[#aaaaaa] tabular-nums text-xs sm:text-sm">{recentTransactions.length} items</p>
            </CardHeader>
          </Card>
        </div>

        {/* Expense Sections */}
        <Accordion type="multiple" defaultValue={['work-lunches']} className="space-y-3 sm:space-y-4">
          {/* Work Lunches */}
          <AccordionItem value="work-lunches" className="border border-[#3f3f3f] rounded-lg bg-[#212121] overflow-hidden">
            <AccordionTrigger className="hover:no-underline hover:bg-[#272727]/50 transition-colors p-4 sm:p-6">
              <div className="text-left w-full">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#f1f1f1]">Work Lunches</h2>
                <p className="text-[#aaaaaa] text-xs sm:text-sm mt-1">
                  {workLunches.length} items · Kings Cross · £{workLunchesTotal.toFixed(2)}
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="md:hidden space-y-3">
                {displayedWorkLunches.map((expense, idx) => (
                  <ExpenseCard key={idx} expense={expense} />
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#3f3f3f]/50">
                      <TableHead className="text-[#f1f1f1] font-bold">Date</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Merchant</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Amount</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedWorkLunches.map((expense, idx) => (
                      <TableRow key={idx} className="border-[#3f3f3f] hover:bg-[#272727]">
                        <TableCell className="text-[#f1f1f1] text-sm">
                          {formatDate(expense.date, expense.day)}
                        </TableCell>
                        <TableCell className="font-medium text-[#f1f1f1]">{expense.merchant}</TableCell>
                        <TableCell className="font-mono font-medium text-[#f1f1f1] tabular-nums">
                          £{expense.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-[#aaaaaa] text-sm">{expense.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {workLunches.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAllWorkLunches(!showAllWorkLunches)}
                  className="w-full text-center text-[#f1f1f1] hover:text-[#ffffff] transition-colors mt-4 py-3"
                >
                  {showAllWorkLunches ? 'Show Less' : `Show ${workLunches.length - INITIAL_SHOW} More`}
                </button>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Qatar Trip */}
          <AccordionItem value="qatar-trip" className="border border-[#3f3f3f] rounded-lg bg-[#212121] overflow-hidden">
            <AccordionTrigger className="hover:no-underline hover:bg-[#272727]/50 transition-colors p-4 sm:p-6">
              <div className="text-left w-full">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#f1f1f1]">Qatar Business Trip</h2>
                <p className="text-[#aaaaaa] text-xs sm:text-sm mt-1">
                  {qatarTrip.length} items · Feb 1-7, 2026 · £{qatarTripTotal.toFixed(2)}
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="md:hidden space-y-3">
                {displayedQatar.map((expense, idx) => (
                  <ExpenseCard key={idx} expense={expense} />
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#3f3f3f]/50">
                      <TableHead className="text-[#f1f1f1] font-bold">Date</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Merchant</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Amount</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Category</TableHead>
                      <TableHead className="text-[#f1f1f1] font-bold">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedQatar.map((expense, idx) => (
                      <TableRow key={idx} className="border-[#3f3f3f] hover:bg-[#272727]">
                        <TableCell className="text-[#f1f1f1] text-sm">
                          {formatDate(expense.date, expense.day)}
                        </TableCell>
                        <TableCell className="font-medium text-[#f1f1f1]">{expense.merchant}</TableCell>
                        <TableCell className="font-mono font-medium text-[#f1f1f1] tabular-nums">
                          £{expense.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-[#aaaaaa] text-sm">{expense.expenseType}</TableCell>
                        <TableCell className="text-[#aaaaaa] text-sm">{expense.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {qatarTrip.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAllQatar(!showAllQatar)}
                  className="w-full text-center text-[#f1f1f1] hover:text-[#ffffff] transition-colors mt-4 py-3"
                >
                  {showAllQatar ? 'Show Less' : `Show ${qatarTrip.length - INITIAL_SHOW} More`}
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer */}
        <div className="border-t border-[#3f3f3f] pt-6 mt-8">
          <p className="text-left text-xs text-[#aaaaaa]">
            Designed and developed by Furquan Ahmad
          </p>
        </div>
      </div>
    </div>
  );
}
