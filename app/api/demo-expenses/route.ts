import { NextResponse } from 'next/server';
import type { Expense, ExpenseSummary } from '@/lib/types';

/**
 * Demo API endpoint with realistic dummy data for social media demos
 * No authentication required - purely for demonstration purposes
 */

// Generate realistic dummy expense data
function generateDemoExpenses(): Expense[] {
  const today = new Date();
  const expenses: Expense[] = [];
  
  // Work Lunches (last 6 weeks)
  const workLunches = [
    { merchant: 'Pret A Manger', amount: 8.95, location: 'Shoreditch, London' },
    { merchant: 'Leon', amount: 12.50, location: 'Old Street, London' },
    { merchant: 'Wasabi', amount: 9.45, location: 'Liverpool Street, London' },
    { merchant: 'Tortilla', amount: 11.30, location: 'Moorgate, London' },
    { merchant: 'Itsu', amount: 13.80, location: 'Shoreditch, London' },
    { merchant: 'Greggs', amount: 4.75, location: 'Liverpool Street, London' },
    { merchant: 'Deliveroo', amount: 18.95, location: 'Office Delivery' },
    { merchant: 'Pret A Manger', amount: 10.25, location: 'Old Street, London' },
    { merchant: 'Gails Bakery', amount: 7.50, location: 'Shoreditch, London' },
    { merchant: 'Dishoom', amount: 24.50, location: 'Shoreditch, London' },
    { merchant: 'Leon', amount: 11.95, location: 'Liverpool Street, London' },
    { merchant: 'Wasabi', amount: 8.75, location: 'Old Street, London' },
    { merchant: 'Tortilla', amount: 10.95, location: 'Moorgate, London' },
    { merchant: 'Pret A Manger', amount: 9.50, location: 'Shoreditch, London' },
    { merchant: 'Deliveroo', amount: 22.45, location: 'Office Delivery' },
    { merchant: 'Itsu', amount: 14.20, location: 'Liverpool Street, London' },
    { merchant: 'Leon', amount: 13.30, location: 'Old Street, London' },
    { merchant: 'Gails Bakery', amount: 8.25, location: 'Shoreditch, London' },
    { merchant: 'Wasabi', amount: 9.95, location: 'Moorgate, London' },
    { merchant: 'Tortilla', amount: 12.15, location: 'Liverpool Street, London' },
    { merchant: 'Pret A Manger', amount: 10.75, location: 'Old Street, London' },
    { merchant: 'Deliveroo', amount: 19.80, location: 'Office Delivery' },
    { merchant: 'Leon', amount: 12.90, location: 'Shoreditch, London' },
    { merchant: 'Itsu', amount: 15.45, location: 'Liverpool Street, London' },
    { merchant: 'Dishoom', amount: 26.75, location: 'Shoreditch, London' },
  ];
  
  // Generate work lunch expenses over last 6 weeks (Mon-Fri)
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  let lunchIndex = 0;
  
  for (let i = 42; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    
    // Only add lunches on weekdays (Mon-Fri)
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && lunchIndex < workLunches.length) {
      const lunch = workLunches[lunchIndex];
      expenses.push({
        date: date.toISOString().split('T')[0],
        day: daysOfWeek[dayOfWeek],
        merchant: lunch.merchant,
        amount: lunch.amount,
        currency: 'GBP',
        category: 'Meals & Entertainment',
        expenseType: 'Lunch',
        purpose: 'Working lunch - office',
        location: lunch.location,
        receiptAttached: 'No',
        notes: 'Office lunch'
      });
      lunchIndex++;
    }
  }
  
  // Recent Business Trip (40 days ago to 35 days ago - outside 30-day window)
  const tripExpenses = [
    // Day 1 - Travel
    { merchant: 'Uber', amount: 45.50, type: 'Transportation', location: 'London, UK', purpose: 'Airport transfer' },
    { merchant: 'Caffè Nero', amount: 5.75, type: 'Meals', location: 'Heathrow, UK', purpose: 'Coffee before flight' },
    { merchant: 'Boots', amount: 18.95, type: 'Travel Supplies', location: 'Heathrow, UK', purpose: 'Travel essentials' },
    { merchant: 'Pret A Manger', amount: 12.50, type: 'Meals', location: 'Heathrow, UK', purpose: 'Meal at airport' },
    
    // Day 2 - Arrival & Hotel
    { merchant: 'Hilton Hotel Manchester', amount: 189.00, type: 'Hotel', location: 'Manchester, UK', purpose: 'Business trip accommodation' },
    { merchant: 'Taxi', amount: 28.50, type: 'Transportation', location: 'Manchester, UK', purpose: 'Airport to hotel' },
    { merchant: 'Starbucks', amount: 6.25, type: 'Meals', location: 'Manchester, UK', purpose: 'Coffee' },
    { merchant: 'Nando\'s', amount: 24.95, type: 'Meals', location: 'Manchester, UK', purpose: 'Dinner' },
    
    // Day 3 - Conference Day 1
    { merchant: 'Costa Coffee', amount: 5.50, type: 'Meals', location: 'Manchester, UK', purpose: 'Morning coffee' },
    { merchant: 'Wagamama', amount: 32.75, type: 'Meals', location: 'Manchester, UK', purpose: 'Client lunch' },
    { merchant: 'Tesco Express', amount: 8.45, type: 'Meals', location: 'Manchester, UK', purpose: 'Snacks and water' },
    { merchant: 'Bills Restaurant', amount: 45.90, type: 'Meals', location: 'Manchester, UK', purpose: 'Business dinner' },
    
    // Day 4 - Conference Day 2  
    { merchant: 'Starbucks', amount: 6.75, type: 'Meals', location: 'Manchester, UK', purpose: 'Morning coffee' },
    { merchant: 'The Ivy', amount: 68.50, type: 'Meals', location: 'Manchester, UK', purpose: 'Client lunch meeting' },
    { merchant: 'WHSmith', amount: 12.30, type: 'Office Supplies', location: 'Manchester, UK', purpose: 'Notebooks and pens' },
    { merchant: 'Dishoom', amount: 52.25, type: 'Meals', location: 'Manchester, UK', purpose: 'Team dinner' },
    
    // Day 5 - Return
    { merchant: 'Costa Coffee', amount: 5.95, type: 'Meals', location: 'Manchester, UK', purpose: 'Coffee before checkout' },
    { merchant: 'Taxi', amount: 32.00, type: 'Transportation', location: 'Manchester, UK', purpose: 'Hotel to airport' },
    { merchant: 'Pret A Manger', amount: 11.75, type: 'Meals', location: 'Manchester Airport, UK', purpose: 'Lunch at airport' },
    { merchant: 'Uber', amount: 48.50, type: 'Transportation', location: 'London, UK', purpose: 'Airport to home' },
  ];
  
  // Add business trip expenses (40 days ago to 35 days ago)
  for (let i = 40; i >= 35; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    
    const dayExpenses = tripExpenses.slice((40 - i) * 4, (40 - i) * 4 + 4);
    
    dayExpenses.forEach(expense => {
      expenses.push({
        date: date.toISOString().split('T')[0],
        day: daysOfWeek[dayOfWeek],
        merchant: expense.merchant,
        amount: expense.amount,
        currency: 'GBP',
        category: expense.type === 'Hotel' ? 'Lodging' : expense.type === 'Transportation' ? 'Transportation' : 'Meals & Entertainment',
        expenseType: expense.type,
        purpose: expense.purpose,
        location: expense.location,
        receiptAttached: expense.amount > 25 ? 'Yes' : 'No',
        notes: 'Manchester business trip'
      });
    });
  }
  
  // Sort by date descending
  expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return expenses;
}

export async function GET() {
  try {
    const expenses = generateDemoExpenses();
    
    // Calculate totals
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate work lunches (exclude business trip dates)
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
    
    const workLunches = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return e.expenseType === 'Lunch' && (expenseDate < fortyDaysAgo || expenseDate > thirtyFiveDaysAgo);
    });
    const workLunchesTotal = workLunches.reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate business trip
    const businessTrip = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= fortyDaysAgo && expenseDate <= thirtyFiveDaysAgo;
    });
    const businessTripTotal = businessTrip.reduce((sum, e) => sum + e.amount, 0);
    
    // Recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTransactions = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const recentTransactionsTotal = recentTransactions.reduce((sum, e) => sum + e.amount, 0);
    
    const responseData: ExpenseSummary & { monzoConnected?: boolean } = {
      expenses,
      total: parseFloat(total.toFixed(2)),
      count: expenses.length,
      workLunches: {
        total: parseFloat(workLunchesTotal.toFixed(2)),
        count: workLunches.length
      },
      qatarTrip: {
        total: parseFloat(businessTripTotal.toFixed(2)),
        count: businessTrip.length
      },
      newMonzo: {
        total: 0,
        count: 0
      },
      lastUpdated: new Date().toISOString(),
      cached: false,
      monzoConnected: true, // Show as connected for demo
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error generating demo expenses:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate demo expenses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
