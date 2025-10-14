"use client";

import { supabase } from "@/lib/supabase";
import { fmtBRL } from "./format";
import { listCategories } from "./repo";

type UUID = string;

type BudgetRow = {
  id: UUID;
  user_id: UUID;
  year: number;
  month: number;
  to_budget_cents: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type BudgetCategoryRow = {
  id: UUID;
  budget_id: UUID;
  category_id: UUID | null;
  budgeted_cents: number;
  activity_cents: number;
  available_cents: number;
  rollover: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: UUID;
    name: string;
    color: string | null;
  } | null;
};

export type BudgetWithCategories = BudgetRow & {
  budget_categories: BudgetCategoryRow[];
};

export const NULL_CATEGORY_KEY = "__null__";
const NULL_KEY = NULL_CATEGORY_KEY;

function categoryKey(categoryId: string | null) {
  return categoryId ?? NULL_KEY;
}

function previousMonth(year: number, month: number) {
  const m = month - 1;
  if (m >= 1) return { year, month: m };
  return { year: year - 1, month: 12 };
}

function nextMonth(year: number, month: number) {
  const m = month + 1;
  if (m <= 12) return { year, month: m };
  return { year: year + 1, month: 1 };
}

export function nowYM() {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

async function fetchBudget(year: number, month: number) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*, budget_categories(*, category:categories(id,name,color))")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    budget_categories: data.budget_categories?.map((cat: any) => ({
      ...cat,
      category: cat.category ?? null
    })) ?? []
  } as BudgetWithCategories;
}

async function ensureCategoryRows(budget: BudgetWithCategories) {
  const categories = await listCategories();
  const existing = new Set(budget.budget_categories.map((item) => categoryKey(item.category_id)));
  const inserts = categories
    .filter((cat) => !existing.has(categoryKey(cat.id)))
    .map((cat) => ({
      budget_id: budget.id,
      category_id: cat.id,
      budgeted_cents: 0,
      rollover: true
    }));

  if (!existing.has(NULL_KEY)) {
    inserts.push({
      budget_id: budget.id,
      category_id: null,
      budgeted_cents: 0,
      rollover: true
    });
  }

  if (inserts.length === 0) return budget;

  await upsertBudgetCategories(
    budget.id,
    inserts.map((item) => ({
      id: undefined,
      category_id: item.category_id,
      budgeted_cents: item.budgeted_cents,
      rollover: item.rollover
    }))
  );

  return (await fetchBudget(budget.year, budget.month))!;
}

export async function getBudget(year: number, month: number) {
  const found = await fetchBudget(year, month);
  if (!found) return null;
  return ensureCategoryRows(found);
}

export async function upsertBudget(input: {
  year: number;
  month: number;
  to_budget_cents: number;
  note?: string | null;
}) {
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      { ...input, note: input.note ?? null },
      { onConflict: "user_id,year,month" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as BudgetRow;
}

export type UpsertBudgetCategoryInput = {
  id?: string;
  category_id: string | null;
  budgeted_cents: number;
  rollover: boolean;
};

export async function getActivityMap(year: number, month: number) {
  const { data, error } = await supabase
    .from("v_budget_activity")
    .select("category_id, executed_cents")
    .eq("year", year)
    .eq("month", month);
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = categoryKey(row.category_id);
    map[key] = Number(row.executed_cents ?? 0);
  }
  return map;
}

export const budgetInternals = {
  getActivityMap
};

export function computeAvailable(prevAvailable: number, budgeted: number, activity: number) {
  return prevAvailable + budgeted - activity;
}

async function getBudgetById(budgetId: string) {
  const { data, error } = await supabase
    .from("budgets")
    .select("id, year, month")
    .eq("id", budgetId)
    .maybeSingle();
  if (error) throw error;
  return data as Pick<BudgetRow, "id" | "year" | "month"> | null;
}

async function getPreviousAvailableMap(year: number, month: number) {
  const { year: prevYear, month: prevMonth } = previousMonth(year, month);
  const prev = await fetchBudget(prevYear, prevMonth);
  if (!prev) return {} as Record<string, number>;
  const map: Record<string, number> = {};
  for (const item of prev.budget_categories) {
    map[categoryKey(item.category_id)] = item.available_cents ?? 0;
  }
  return map;
}

export async function upsertBudgetCategories(
  budgetId: string,
  items: UpsertBudgetCategoryInput[]
) {
  if (items.length === 0) return [] as BudgetCategoryRow[];
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error("Budget inexistente");
  const activityMap = await budgetInternals.getActivityMap(budget.year, budget.month);
  const prevAvailableMap = await getPreviousAvailableMap(budget.year, budget.month);

  const payload = items.map((item) => {
    const key = categoryKey(item.category_id ?? null);
    const prev = item.rollover ? prevAvailableMap[key] ?? 0 : 0;
    const activity = activityMap[key] ?? 0;
    const available = computeAvailable(prev, item.budgeted_cents, activity);
    return {
      id: item.id,
      budget_id: budgetId,
      category_id: item.category_id,
      budgeted_cents: item.budgeted_cents,
      rollover: item.rollover,
      activity_cents: activity,
      available_cents: available
    };
  });

  const { data, error } = await supabase
    .from("budget_categories")
    .upsert(payload)
    .select("*, category:categories(id,name,color)");
  if (error) throw error;
  return data?.map((row: any) => ({
    ...row,
    category: row.category ?? null
  })) as BudgetCategoryRow[];
}

export async function copyFromPrevious(year: number, month: number) {
  const current = await fetchBudget(year, month);
  if (!current) throw new Error("Budget não encontrado");
  const prevYM = previousMonth(year, month);
  const previous = await fetchBudget(prevYM.year, prevYM.month);
  if (!previous) return current;
  const currentByKey = new Map(
    current.budget_categories.map((item) => [categoryKey(item.category_id), item])
  );
  const inputs: UpsertBudgetCategoryInput[] = previous.budget_categories.map((item) => ({
    id: currentByKey.get(categoryKey(item.category_id))?.id,
    category_id: item.category_id,
    budgeted_cents: item.budgeted_cents,
    rollover: item.rollover
  }));
  await upsertBudgetCategories(current.id, inputs);
  return (await fetchBudget(year, month))!;
}

export async function suggestFromAvg3m(year: number, month: number) {
  const months: { year: number; month: number }[] = [];
  let cursor = previousMonth(year, month);
  for (let i = 0; i < 3; i += 1) {
    months.push(cursor);
    cursor = previousMonth(cursor.year, cursor.month);
  }
  const aggregate: Record<string, number> = {};
  for (const item of months) {
    const map = await budgetInternals.getActivityMap(item.year, item.month);
    for (const [key, value] of Object.entries(map)) {
      aggregate[key] = (aggregate[key] ?? 0) + value;
    }
  }
  const result: Record<string, number> = {};
  for (const [key, total] of Object.entries(aggregate)) {
    result[key] = Math.round(total / months.length);
  }
  return result;
}

export async function getBudgetSummary(year: number, month: number) {
  const budget = await getBudget(year, month);
  if (!budget) return null;
  const activityMap = await budgetInternals.getActivityMap(year, month);
  const prevAvailableMap = await getPreviousAvailableMap(year, month);
  const categories = budget.budget_categories.map((item) => {
    const key = categoryKey(item.category_id);
    const activity = activityMap[key] ?? 0;
    const prev = item.rollover ? prevAvailableMap[key] ?? 0 : 0;
    const available = computeAvailable(prev, item.budgeted_cents, activity);
    return { ...item, activity_cents: activity, available_cents: available };
  });
  const totals = categories.reduce(
    (acc, item) => {
      acc.budgeted += item.budgeted_cents;
      acc.activity += item.activity_cents;
      acc.available += item.available_cents;
      return acc;
    },
    { budgeted: 0, activity: 0, available: 0 }
  );
  return { budget: { ...budget, budget_categories: categories }, totals };
}

export function formatMonthLabel(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function budgetStatusFromTotals(totals: { budgeted: number; activity: number; available: number }) {
  if (totals.available < 0) return { tone: "danger", label: "Estourado" } as const;
  const ratio = totals.budgeted > 0 ? totals.activity / totals.budgeted : 0;
  if (ratio > 0.9) return { tone: "warning", label: "Atento" } as const;
  return { tone: "success", label: "No verde" } as const;
}

export function centsToBRL(cents: number) {
  return fmtBRL(cents);
}

export async function listRecentBudgets(limit = 6) {
  const { data, error } = await supabase
    .from("budgets")
    .select("id, year, month, to_budget_cents")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Pick<BudgetRow, "id" | "year" | "month" | "to_budget_cents">[];
}
