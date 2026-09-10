import type { Account, Bill, Budget, Goal, Transaction } from "@/types";
import { activeTransactions, availableBalance, monthTotals } from "./finance";
import { addDays, addMonths, currentMonth, monthOf, todayISO } from "./dates";

/* -------------------------------------------------------------------------- */
/*                            Cash-Flow Forecast (PRD §10)                    */
/* -------------------------------------------------------------------------- */

export interface DailyProjection {
  date: string;
  dayLabel: string;
  balance: number;
  inflow: number;
  outflow: number;
  events: Array<{ description: string; amount: number; type: "inflow" | "outflow" }>;
}

export interface ForecastSummary {
  currentBalance: number;
  projectedBalance: number;
  totalInflows: number;
  totalOutflows: number;
  lowestBalance: number;
  lowestDate: string;
  horizonDays: number;
  riskState: "comfortable" | "tight" | "at-risk";
  daily: DailyProjection[];
}

export function generateCashFlowForecast(
  accounts: Account[],
  txs: Transaction[],
  bills: Bill[],
  goals: Goal[],
  horizonDays: number = 30
): ForecastSummary {
  const currentBal = availableBalance(txs, accounts);
  const activeTxs = activeTransactions(txs);
  const today = todayISO();
  const endDate = addDays(today, horizonDays);

  const recurringIncomeTxs = activeTxs.filter(
    (t) => t.type === "income" && (t.isRecurring || t.recurrence != null)
  );

  const unpaidBills = bills.filter((b) => !b.paid && b.dueDate >= today && b.dueDate <= endDate);
  
  const goalCommitments: Array<{ name: string; monthlyAmount: number }> = [];
  for (const g of goals) {
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    if (remaining > 0 && g.targetDate && g.targetDate > today) {
      const todayYear = parseInt(today.slice(0, 4), 10);
      const todayMonth = parseInt(today.slice(5, 7), 10);
      const targetYear = parseInt(g.targetDate.slice(0, 4), 10);
      const targetMonth = parseInt(g.targetDate.slice(5, 7), 10);
      const monthsLeft = Math.max(1, (targetYear - todayYear) * 12 + (targetMonth - todayMonth));
      goalCommitments.push({ name: g.name, monthlyAmount: remaining / monthsLeft });
    }
  }

  let runningBal = currentBal;
  let totalInflows = 0;
  let totalOutflows = 0;
  let lowestBal = currentBal;
  let lowestDate = today;
  const daily: DailyProjection[] = [];

  for (let d = 0; d <= horizonDays; d++) {
    const dDate = addDays(today, d);
    const dayOfMonth = parseInt(dDate.slice(8, 10), 10);
    const events: Array<{ description: string; amount: number; type: "inflow" | "outflow" }> = [];
    let dayInflow = 0;
    let dayOutflow = 0;

    for (const b of unpaidBills) {
      if (b.dueDate === dDate) {
        dayOutflow += b.amount;
        events.push({ description: b.name, amount: b.amount, type: "outflow" });
      }
    }

    for (const r of recurringIncomeTxs) {
      const rDay = parseInt(r.date.slice(8, 10), 10);
      if (rDay === dayOfMonth) {
        dayInflow += r.amount;
        events.push({ description: `${r.description} (recurring)`, amount: r.amount, type: "inflow" });
      }
    }

    if (dayOfMonth === 1 && goalCommitments.length > 0 && d > 0) {
      for (const g of goalCommitments) {
        dayOutflow += g.monthlyAmount;
        events.push({ description: `Goal: ${g.name}`, amount: g.monthlyAmount, type: "outflow" });
      }
    }

    runningBal = runningBal + dayInflow - dayOutflow;
    totalInflows += dayInflow;
    totalOutflows += dayOutflow;

    if (runningBal < lowestBal) {
      lowestBal = runningBal;
      lowestDate = dDate;
    }

    daily.push({
      date: dDate,
      dayLabel: dDate.slice(5),
      balance: Math.round(runningBal),
      inflow: Math.round(dayInflow),
      outflow: Math.round(dayOutflow),
      events,
    });
  }

  const recentMonth = currentMonth();
  const recentTotals = monthTotals(txs, recentMonth);
  const avgMonthlyBurn = Math.max(10000, recentTotals.expense);

  let riskState: "comfortable" | "tight" | "at-risk" = "comfortable";
  if (lowestBal < 0) {
    riskState = "at-risk";
  } else if (lowestBal < avgMonthlyBurn * 0.5) {
    riskState = "tight";
  }

  return {
    currentBalance: Math.round(currentBal),
    projectedBalance: Math.round(runningBal),
    totalInflows: Math.round(totalInflows),
    totalOutflows: Math.round(totalOutflows),
    lowestBalance: Math.round(lowestBal),
    lowestDate,
    horizonDays,
    riskState,
    daily,
  };
}

/* -------------------------------------------------------------------------- */
/*                         Financial Health (PRD §13)                         */
/* -------------------------------------------------------------------------- */

export interface HealthPillar {
  title: string;
  score: number;
  maxScore: 25;
  status: "excellent" | "good" | "fair" | "watch";
  detail: string;
  tip: string;
}

export interface FinancialHealthResult {
  totalScore: number;
  rating: "Excellent" | "Good" | "Fair" | "Needs Attention";
  pillars: HealthPillar[];
  topRecommendation: string;
}

export function computeFinancialHealth(
  accounts: Account[],
  txs: Transaction[],
  budgets: Budget[],
  bills: Bill[],
  goals: Goal[]
): FinancialHealthResult {
  const thisMonth = currentMonth();
  const lastMonth = addMonths(thisMonth, -1);
  const curTotals = monthTotals(txs, thisMonth);
  const prevTotals = monthTotals(txs, lastMonth);
  const balance = availableBalance(txs, accounts);

  let budgetScore = 25;
  let overCount = 0;
  let warnCount = 0;
  for (const b of budgets) {
    const spent = activeTransactions(txs)
      .filter((t) => t.type === "expense" && t.categoryId === b.categoryId && monthOf(t.date) === thisMonth)
      .reduce((s, t) => s + t.amount, 0);
    const ratio = b.amount > 0 ? spent / b.amount : 0;
    if (ratio >= 1.0) overCount++;
    else if (ratio >= 0.85) warnCount++;
  }
  budgetScore = Math.max(5, 25 - overCount * 8 - warnCount * 4);
  const budgetStatus: HealthPillar["status"] =
    budgetScore >= 22 ? "excellent" : budgetScore >= 17 ? "good" : budgetScore >= 12 ? "fair" : "watch";

  const savingsRate = curTotals.savingsRate;
  let savingsScore = 15;
  if (savingsRate >= 0.25) savingsScore = 25;
  else if (savingsRate >= 0.15) savingsScore = 20;
  else if (savingsRate > 0) savingsScore = 15;
  else savingsScore = 5;
  const savingsStatus: HealthPillar["status"] =
    savingsScore >= 22 ? "excellent" : savingsScore >= 18 ? "good" : savingsScore >= 14 ? "fair" : "watch";

  const upcomingBillsTotal = bills
    .filter((b) => !b.paid && b.dueDate >= todayISO() && b.dueDate <= addDays(todayISO(), 30))
    .reduce((s, b) => s + b.amount, 0);
  let obligationScore = 25;
  if (balance < upcomingBillsTotal) {
    obligationScore = 8;
  } else if (balance < upcomingBillsTotal * 1.5) {
    obligationScore = 16;
  } else {
    obligationScore = 25;
  }
  const obligationStatus: HealthPillar["status"] =
    obligationScore >= 22 ? "excellent" : obligationScore >= 16 ? "good" : "watch";

  const monthlyExpense = Math.max(curTotals.expense, prevTotals.expense, 5000);
  const monthsBuffer = balance / monthlyExpense;
  let bufferScore = 10;
  if (monthsBuffer >= 3) bufferScore = 25;
  else if (monthsBuffer >= 1.5) bufferScore = 20;
  else if (monthsBuffer >= 1) bufferScore = 15;
  else bufferScore = 8;
  const bufferStatus: HealthPillar["status"] =
    bufferScore >= 22 ? "excellent" : bufferScore >= 18 ? "good" : bufferScore >= 14 ? "fair" : "watch";

  const totalScore = budgetScore + savingsScore + obligationScore + bufferScore;
  const rating: FinancialHealthResult["rating"] =
    totalScore >= 85 ? "Excellent" : totalScore >= 70 ? "Good" : totalScore >= 50 ? "Fair" : "Needs Attention";

  const pillars: HealthPillar[] = [
    {
      title: "Budget Control",
      score: budgetScore,
      maxScore: 25,
      status: budgetStatus,
      detail: overCount === 0 ? "All budgets strictly respected" : `${overCount} category exceeded budget`,
      tip: overCount > 0 ? "Review category limits to prevent recurring overspending." : "Great discipline this month.",
    },
    {
      title: "Savings Rate",
      score: savingsScore,
      maxScore: 25,
      status: savingsStatus,
      detail: `${(savingsRate * 100).toFixed(1)}% saved from household income`,
      tip: savingsRate < 0.15 ? "Target setting aside at least 15–20% of net income." : "Healthy savings pace.",
    },
    {
      title: "Upcoming Obligations",
      score: obligationScore,
      maxScore: 25,
      status: obligationStatus,
      detail: balance >= upcomingBillsTotal ? "Upcoming bills comfortably covered" : "Tight liquidity vs upcoming bills",
      tip: balance < upcomingBillsTotal ? "Ensure sufficient cash in active accounts before bill due dates." : "No liquidity bottlenecks anticipated.",
    },
    {
      title: "Emergency Cash Buffer",
      score: bufferScore,
      maxScore: 25,
      status: bufferStatus,
      detail: `${monthsBuffer.toFixed(1)} months of living expenses in reserve`,
      tip: monthsBuffer < 3 ? "Aim for 3–6 months of household reserve in savings accounts." : "Solid emergency safety net.",
    },
  ];

  let topRecommendation = "Keep monitoring your joint budget and maintain regular goal contributions.";
  if (overCount > 0) {
    topRecommendation = "Cap your top over-budget categories to safeguard this month's savings.";
  } else if (monthsBuffer < 2) {
    topRecommendation = "Direct extra monthly surplus into your emergency cash reserve.";
  } else if (savingsRate < 0.15) {
    topRecommendation = "Automate regular transfers to your shared savings goals.";
  }

  return { totalScore, rating, pillars, topRecommendation };
}

/* -------------------------------------------------------------------------- */
/*                        Spending Insights (PRD §12)                         */
/* -------------------------------------------------------------------------- */

export interface SpendingInsight {
  id: string;
  type: "positive" | "warning" | "info";
  title: string;
  description: string;
  categoryName?: string;
  amount?: number;
}

export function computeSpendingInsights(
  txs: Transaction[],
  categories: { id: string; name: string }[],
  budgets: Budget[]
): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  const thisMonth = currentMonth();
  const lastMonth = addMonths(thisMonth, -1);

  const active = activeTransactions(txs);
  const thisMonthTxs = active.filter((t) => monthOf(t.date) === thisMonth && t.type === "expense");
  const lastMonthTxs = active.filter((t) => monthOf(t.date) === lastMonth && t.type === "expense");

  if (thisMonthTxs.length > 0) {
    const sortedByAmt = [...thisMonthTxs].sort((a, b) => b.amount - a.amount);
    const top = sortedByAmt[0];
    const cat = categories.find((c) => c.id === top.categoryId);
    insights.push({
      id: "largest-expense",
      type: "info",
      title: "Largest Expense This Month",
      description: `"${top.description || cat?.name || 'Expense'}" at ৳${top.amount.toLocaleString()} is your biggest single outflow.`,
      amount: top.amount,
    });
  }

  const categoryMapThisMonth = new Map<string, number>();
  const categoryMapLastMonth = new Map<string, number>();

  for (const t of thisMonthTxs) {
    categoryMapThisMonth.set(t.categoryId, (categoryMapThisMonth.get(t.categoryId) ?? 0) + t.amount);
  }
  for (const t of lastMonthTxs) {
    categoryMapLastMonth.set(t.categoryId, (categoryMapLastMonth.get(t.categoryId) ?? 0) + t.amount);
  }

  for (const [catId, curAmt] of categoryMapThisMonth.entries()) {
    const prevAmt = categoryMapLastMonth.get(catId) ?? 0;
    if (prevAmt > 2000 && curAmt > prevAmt * 1.2) {
      const pctIncrease = Math.round(((curAmt - prevAmt) / prevAmt) * 100);
      const cat = categories.find((c) => c.id === catId);
      insights.push({
        id: `surge-${catId}`,
        type: "warning",
        title: `${cat?.name ?? 'Category'} Spending Surge`,
        description: `${cat?.name ?? 'Category'} spending is ${pctIncrease}% higher than last month (+৳${(curAmt - prevAmt).toLocaleString()}).`,
        categoryName: cat?.name,
        amount: curAmt - prevAmt,
      });
    }
  }

  const sharedThis = thisMonthTxs.filter((t) => t.ownership === "shared").reduce((s, t) => s + t.amount, 0);
  const sharedLast = lastMonthTxs.filter((t) => t.ownership === "shared").reduce((s, t) => s + t.amount, 0);
  if (sharedLast > 0 && sharedThis > 0) {
    const diff = sharedThis - sharedLast;
    if (diff > 3000) {
      insights.push({
        id: "shared-increase",
        type: "info",
        title: "Shared Expenses Trend",
        description: `Shared household expenses increased by ৳${diff.toLocaleString()} compared to last month.`,
        amount: diff,
      });
    }
  }

  const daysInMonth = 30;
  const currentDay = parseInt(todayISO().slice(8, 10), 10);
  const daysRemaining = Math.max(1, daysInMonth - currentDay);

  for (const b of budgets) {
    const spent = thisMonthTxs.filter((t) => t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0);
    const cat = categories.find((c) => c.id === b.categoryId);
    const usedPct = b.amount > 0 ? (spent / b.amount) * 100 : 0;

    if (usedPct >= 100) {
      insights.push({
        id: `budget-over-${b.id}`,
        type: "warning",
        title: `${cat?.name ?? 'Budget'} Exceeded`,
        description: `Exceeded ${cat?.name} budget by ৳${(spent - b.amount).toLocaleString()} with ${daysRemaining} days left.`,
        categoryName: cat?.name,
      });
    } else if (usedPct >= 75 && daysRemaining >= 10) {
      insights.push({
        id: `budget-near-${b.id}`,
        type: "warning",
        title: `${cat?.name ?? 'Budget'} Near Limit`,
        description: `Used ${Math.round(usedPct)}% of ${cat?.name} budget with ${daysRemaining} days remaining in the month.`,
        categoryName: cat?.name,
      });
    }
  }

  return insights.slice(0, 6);
}

/* -------------------------------------------------------------------------- */
/*                      Subscription Intelligence (PRD §8)                    */
/* -------------------------------------------------------------------------- */

export interface SubscriptionMetrics {
  totalMonthlyEquivalent: number;
  totalAnnualEquivalent: number;
  activeCount: number;
  renewingIn7DaysCount: number;
  items: Array<{
    bill: Bill;
    monthlyEquivalent: number;
    annualEquivalent: number;
    status: "active" | "due-soon" | "overdue";
  }>;
}

export function computeSubscriptionMetrics(bills: Bill[]): SubscriptionMetrics {
  const subs = bills.filter(
    (b) =>
      b.isSubscription ||
      b.recurring === "monthly" ||
      b.recurring === "yearly" ||
      b.name.toLowerCase().includes("netflix") ||
      b.name.toLowerCase().includes("spotify") ||
      b.name.toLowerCase().includes("youtube") ||
      b.name.toLowerCase().includes("prime") ||
      b.name.toLowerCase().includes("internet") ||
      b.name.toLowerCase().includes("wifi")
  );

  let totalMonthly = 0;
  let totalAnnual = 0;
  let renewing7Days = 0;
  const today = todayISO();
  const next7Days = addDays(today, 7);

  const items = subs.map((b) => {
    let monthly = b.amount;
    let annual = b.amount * 12;

    if (b.recurring === "yearly") {
      monthly = b.amount / 12;
      annual = b.amount;
    } else if (b.recurring === "weekly") {
      monthly = (b.amount * 52) / 12;
      annual = b.amount * 52;
    } else if (b.recurring === "daily") {
      monthly = b.amount * 30;
      annual = b.amount * 365;
    }

    totalMonthly += monthly;
    totalAnnual += annual;

    if (!b.paid && b.dueDate >= today && b.dueDate <= next7Days) {
      renewing7Days++;
    }

    const status: "active" | "due-soon" | "overdue" =
      b.paid ? "active" : b.dueDate < today ? "overdue" : b.dueDate <= next7Days ? "due-soon" : "active";

    return {
      bill: b,
      monthlyEquivalent: Math.round(monthly),
      annualEquivalent: Math.round(annual),
      status,
    };
  });

  return {
    totalMonthlyEquivalent: Math.round(totalMonthly),
    totalAnnualEquivalent: Math.round(totalAnnual),
    activeCount: subs.length,
    renewingIn7DaysCount: renewing7Days,
    items,
  };
}

/* -------------------------------------------------------------------------- */
/*                       Upcoming Timeline (PRD §9)                           */
/* -------------------------------------------------------------------------- */

export interface UpcomingTimelineItem {
  id: string;
  sourceType: "bill" | "recurring_income" | "recurring_expense" | "goal";
  title: string;
  amount: number;
  date: string;
  direction: "inflow" | "outflow";
  ownership: "shared" | "personal";
  status: "upcoming" | "due-today" | "due-soon" | "overdue" | "paid";
  accountName?: string;
  rawItem?: Bill | Transaction | Goal;
}

export function computeUpcomingTimeline(
  bills: Bill[],
  txs: Transaction[],
  goals: Goal[],
  accounts: Account[]
): {
  items: UpcomingTimelineItem[];
  committedOutflows30d: number;
  expectedInflows30d: number;
  net30dCommitment: number;
} {
  const items: UpcomingTimelineItem[] = [];
  const today = todayISO();
  const next30d = addDays(today, 30);
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  for (const b of bills) {
    let status: UpcomingTimelineItem["status"] = "upcoming";
    if (b.paid) status = "paid";
    else if (b.dueDate < today) status = "overdue";
    else if (b.dueDate === today) status = "due-today";
    else if (b.dueDate <= addDays(today, 3)) status = "due-soon";

    items.push({
      id: `bill-${b.id}`,
      sourceType: "bill",
      title: b.name,
      amount: b.amount,
      date: b.dueDate,
      direction: "outflow",
      ownership: b.ownership,
      status,
      accountName: b.accountId ? accountMap.get(b.accountId) : undefined,
      rawItem: b,
    });
  }

  const activeTxs = activeTransactions(txs);
  for (const t of activeTxs) {
    if ((t.isRecurring || t.recurrence) && t.nextDueDate) {
      items.push({
        id: `rec-${t.id}`,
        sourceType: t.type === "income" ? "recurring_income" : "recurring_expense",
        title: `${t.description} (recurring)`,
        amount: t.amount,
        date: t.nextDueDate,
        direction: t.type === "income" ? "inflow" : "outflow",
        ownership: t.ownership,
        status: t.nextDueDate < today ? "overdue" : t.nextDueDate === today ? "due-today" : "upcoming",
        accountName: t.accountId ? accountMap.get(t.accountId) : undefined,
        rawItem: t,
      });
    }
  }

  for (const g of goals) {
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    if (remaining > 0 && g.targetDate) {
      items.push({
        id: `goal-${g.id}`,
        sourceType: "goal",
        title: `Goal: ${g.name}`,
        amount: remaining,
        date: g.targetDate,
        direction: "outflow",
        ownership: "shared",
        status: g.targetDate < today ? "overdue" : "upcoming",
        rawItem: g,
      });
    }
  }

  items.sort((a, b) => (a.date < b.date ? -1 : 1));

  const next30Items = items.filter((i) => i.date >= today && i.date <= next30d && i.status !== "paid");
  const committedOutflows30d = next30Items
    .filter((i) => i.direction === "outflow")
    .reduce((s, i) => s + i.amount, 0);
  const expectedInflows30d = next30Items
    .filter((i) => i.direction === "inflow")
    .reduce((s, i) => s + i.amount, 0);

  return {
    items,
    committedOutflows30d: Math.round(committedOutflows30d),
    expectedInflows30d: Math.round(expectedInflows30d),
    net30dCommitment: Math.round(expectedInflows30d - committedOutflows30d),
  };
}
