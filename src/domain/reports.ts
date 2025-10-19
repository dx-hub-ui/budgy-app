"use client";

import { supabase } from "@/lib/supabase";

export type DashboardFilters = {
  month: string;
  categoryId?: string | null;
  accountId?: string | null;
};

export type BreakdownCategory = {
  id: string | null;
  name: string;
  color: string;
  amount: number;
  percentage: number;
};

export type SpendingTrends = {
  labels: string[];
  totals: number[];
  average: number;
};

export type NetWorthSnapshot = {
  assets: number;
  debts: number;
  net: number;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    groupLabel: string;
  }>;
};

export type IncomeExpenseSummary = {
  income: number;
  expense: number;
  net: number;
};

export type AgeOfMoney = {
  days: number | null;
  cashOnHand: number;
  avgDailyOutflow: number;
};

export type DashboardReport = {
  totalSpending: number;
  breakdown: BreakdownCategory[];
  trends: SpendingTrends;
  incomeExpense: IncomeExpenseSummary;
  netWorth: NetWorthSnapshot;
  ageOfMoney: AgeOfMoney;
};

type TransactionRow = {
  id: string;
  occurred_on: string;
  amount_cents: number;
  direction: "outflow" | "inflow";
  category: { id: string; name: string; group_name: string | null } | null;
  account: { id: string; name: string; type: string; group_label: string } | null;
};

type NetWorthRow = {
  account_id: string;
  amount_cents: number;
  direction: "outflow" | "inflow";
  account: { id: string; name: string; type: string; group_label: string } | null;
};

function toDateParts(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    throw new Error("Mês inválido informado para o relatório");
  }
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return { start, end };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subtractMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() - months);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function generateMonthSequence(end: Date, count: number) {
  const months: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const month = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    months.push(month);
  }
  return months;
}

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

const COLOR_PALETTE = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#f43f5e",
  "#0ea5e9",
  "#a855f7",
  "#eab308",
  "#14b8a6",
  "#fb7185",
  "#0d9488",
  "#facc15",
  "#4f46e5"
];

function colorFromKey(key: string) {
  let hash = 7;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 0xfffffff;
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

export async function fetchDashboardReport(filters: DashboardFilters): Promise<DashboardReport> {
  const { start, end } = toDateParts(filters.month);
  const trendStart = subtractMonths(start, 5);
  const startIso = isoDate(start);
  const endIso = isoDate(end);
  const trendStartIso = isoDate(trendStart);

  let txQuery = supabase
    .from("account_transactions")
    .select(
      "id, occurred_on, amount_cents, direction, category:budget_categories(id,name,group_name), account:accounts(id,name,type,group_label)"
    )
    .gte("occurred_on", trendStartIso)
    .lt("occurred_on", endIso)
    .is("deleted_at", null)
    .order("occurred_on", { ascending: true });

  if (filters.categoryId) {
    txQuery = txQuery.eq("category_id", filters.categoryId);
  }
  if (filters.accountId) {
    txQuery = txQuery.eq("account_id", filters.accountId);
  }

  const { data: txRows, error: txError } = await txQuery;
  if (txError) throw txError;

  const transactions = ((txRows ?? []) as unknown) as TransactionRow[];
  const selectedMonthRows = transactions.filter((row) => row.occurred_on >= startIso && row.occurred_on < endIso);

  const breakdownMap = new Map<string, BreakdownCategory>();
  let totalOutflow = 0;
  selectedMonthRows.forEach((row, index) => {
    if (row.direction !== "outflow") return;
    const amount = Number(row.amount_cents ?? 0);
    totalOutflow += amount;
    const key = row.category?.id ?? "uncategorized";
    if (!breakdownMap.has(key)) {
      const colorKey = `${row.category?.id ?? row.category?.name ?? key}-${row.category?.group_name ?? ""}`;
      breakdownMap.set(key, {
        id: row.category?.id ?? null,
        name: row.category?.name ?? "Sem categoria",
        color: colorFromKey(colorKey),
        amount: 0,
        percentage: 0
      });
    }
    const current = breakdownMap.get(key)!;
    current.amount += amount;
  });

  const breakdown = Array.from(breakdownMap.values())
    .map((item) => ({
      ...item,
      percentage: totalOutflow > 0 ? item.amount / totalOutflow : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthsSequence = generateMonthSequence(start, 6);
  const trendTotals = monthsSequence.map((monthDate) => {
    const monthKey = toMonthKey(monthDate);
    return transactions.reduce((acc, row) => {
      if (row.direction !== "outflow") return acc;
      const rowDate = new Date(row.occurred_on + "T00:00:00Z");
      const rowKey = `${rowDate.getUTCFullYear()}-${String(rowDate.getUTCMonth() + 1).padStart(2, "0")}`;
      if (rowKey === monthKey) {
        return acc + Number(row.amount_cents ?? 0);
      }
      return acc;
    }, 0);
  });

  const trends: SpendingTrends = {
    labels: monthsSequence.map((monthDate) =>
      monthDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    ),
    totals: trendTotals,
    average: trendTotals.length > 0 ? trendTotals.reduce((sum, value) => sum + value, 0) / trendTotals.length : 0
  };

  let totalIncome = 0;
  selectedMonthRows.forEach((row) => {
    const amount = Number(row.amount_cents ?? 0);
    if (row.direction === "inflow") {
      totalIncome += amount;
    }
  });

  const incomeExpense: IncomeExpenseSummary = {
    income: totalIncome,
    expense: totalOutflow,
    net: totalIncome - totalOutflow
  };

  let netQuery = supabase
    .from("account_transactions")
    .select("account_id, amount_cents, direction, account:accounts(id,name,type,group_label)")
    .lte("occurred_on", endIso)
    .is("deleted_at", null);

  if (filters.accountId) {
    netQuery = netQuery.eq("account_id", filters.accountId);
  }

  const { data: netRows, error: netError } = await netQuery;
  if (netError) throw netError;

  const netTransactions = ((netRows ?? []) as unknown) as NetWorthRow[];

  const balances = new Map<string, { id: string; name: string; type: string; groupLabel: string; balance: number }>();
  netTransactions.forEach((row) => {
    if (!row.account_id || !row.account) return;
    const multiplier = row.direction === "inflow" ? 1 : -1;
    const amount = Number(row.amount_cents ?? 0);
    const entry = balances.get(row.account_id) ?? {
      id: row.account.id,
      name: row.account.name,
      type: row.account.type,
      groupLabel: row.account.group_label,
      balance: 0
    };
    entry.balance += multiplier * amount;
    balances.set(row.account_id, entry);
  });

  let assets = 0;
  let debts = 0;
  const accountSummaries = Array.from(balances.values()).sort((a, b) => b.balance - a.balance);
  accountSummaries.forEach((entry) => {
    if (entry.balance >= 0) {
      assets += entry.balance;
    } else {
      debts += entry.balance;
    }
  });

  const netWorth: NetWorthSnapshot = {
    assets,
    debts,
    net: assets + debts,
    accounts: accountSummaries
  };

  const daysInMonth = getDaysInMonth(start, end);
  const avgDailyOutflow = totalOutflow > 0 ? totalOutflow / daysInMonth : 0;
  const cashOnHand = Math.max(0, assets + Math.min(0, debts));
  const ageOfMoney: AgeOfMoney = {
    days: avgDailyOutflow > 0 ? Math.round(cashOnHand / avgDailyOutflow) : null,
    cashOnHand,
    avgDailyOutflow
  };

  return {
    totalSpending: totalOutflow,
    breakdown,
    trends,
    incomeExpense,
    netWorth,
    ageOfMoney
  };
}

export function buildRecentMonthOptions(count = 12) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const options = [] as Array<{ value: string; label: string }>;
  for (let i = 0; i < count; i += 1) {
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - i, 1));
    const value = toMonthKey(cursor);
    const label = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}
