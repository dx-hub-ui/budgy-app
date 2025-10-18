"use client";

import { supabase } from "@/lib/supabase";
import { fmtBRL } from "./format";
import { listCategories, monthToRange } from "./repo";

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
  group_name?: string | null;
  category?: {
    id: UUID;
    name: string;
    color: string | null;
    group_name?: string | null;
  } | null;
};

export type BudgetWithCategories = BudgetRow & {
  budget_categories: BudgetCategoryRow[];
};

export const NULL_CATEGORY_KEY = "__null__";
const NULL_KEY = NULL_CATEGORY_KEY;

const GROUP_SEQUENCE = [
  "Immediate Obligations",
  "Debt Payments",
  "True Expenses",
  "Quality of Life Goals",
  "Just for Fun"
];

const GROUP_INDEX = new Map(GROUP_SEQUENCE.map((name, index) => [name, index]));

const DEFAULT_GROUP = GROUP_SEQUENCE[0];

function resolveGroupName(row: BudgetCategoryRow) {
  const explicit = (row.group_name ?? (row as any)?.group) as string | null | undefined;
  if (explicit && explicit.trim().length > 0) return explicit;
  const categoryGroup = (row.category as any)?.group_name as string | null | undefined;
  if (categoryGroup && categoryGroup.trim().length > 0) return categoryGroup;
  return DEFAULT_GROUP;
}

function compareGroup(a: string, b: string) {
  const ai = GROUP_INDEX.get(a) ?? GROUP_SEQUENCE.length;
  const bi = GROUP_INDEX.get(b) ?? GROUP_SEQUENCE.length;
  if (ai !== bi) return ai - bi;
  return a.localeCompare(b, "en-US");
}

export type BudgetGoalType = "TB" | "TBD" | "MFG" | "CUSTOM";

export type BudgetGoal = {
  id: UUID;
  org_id?: UUID | null;
  category_id: UUID;
  goal_type: BudgetGoalType;
  amount_cents: number;
  target_month: string | null;
  cadence?: "weekly" | "monthly" | "yearly" | "custom" | null;
  due_day_of_month?: number | null;
};

export type BudgetAllocationView = {
  id: UUID;
  category_id: UUID | null;
  group_name: string;
  name: string;
  color: string | null;
  budgeted_cents: number;
  activity_cents: number;
  available_cents: number;
  prev_available_cents: number;
  rollover: boolean;
  goal: BudgetGoal | null;
};

export type BudgetMonthSummary = {
  budgetId: UUID;
  year: number;
  month: number;
  funds_for_month_cents: number;
  overspent_last_month_cents: number;
  budgeted_in_month_cents: number;
  budgeted_in_future_cents: number;
  inflows_cents: number;
  to_be_budgeted_cents: number;
};

export type BudgetMonthEnvelope = {
  summary: BudgetMonthSummary;
  categories: BudgetAllocationView[];
  previousBudgetedMap: Record<string, number>;
  previousActivityMap: Record<string, number>;
  averageBudgetedMap: Record<string, number>;
  averageActivityMap: Record<string, number>;
};

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

function budgetCategoryName(row: BudgetCategoryRow) {
  if (row.category && row.category.name) return row.category.name;
  if (row.category_id === null) return "Sem categoria";
  return "Categoria removida";
}

function budgetCategoryColor(row: BudgetCategoryRow) {
  if (row.category && row.category.color) return row.category.color;
  return "var(--cc-primary)";
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

type BudgetCategoryUpsertPayload = {
  id?: string;
  budget_id: string;
  category_id: string | null;
  budgeted_cents: number;
  rollover: boolean;
  activity_cents: number;
  available_cents: number;
};

export async function getActivityMap(year: number, month: number) {
  const { s, e } = monthToRange({ year, month });
  const { data, error } = await supabase
    .from("account_transactions")
    .select("category_id, amount_cents, direction")
    .gte("occurred_on", s)
    .lt("occurred_on", e)
    .eq("direction", "outflow")
    .is("deleted_at", null);
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = categoryKey(row.category_id);
    const amount = Number(row.amount_cents ?? 0);
    map[key] = (map[key] ?? 0) + amount;
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

  const payload: BudgetCategoryUpsertPayload[] = items.map((item) => {
    const key = categoryKey(item.category_id ?? null);
    const prev = item.rollover ? prevAvailableMap[key] ?? 0 : 0;
    const activity = activityMap[key] ?? 0;
    const available = computeAvailable(prev, item.budgeted_cents, activity);
    const payloadItem: BudgetCategoryUpsertPayload = {
      budget_id: budgetId,
      category_id: item.category_id,
      budgeted_cents: item.budgeted_cents,
      rollover: item.rollover,
      activity_cents: activity,
      available_cents: available
    };
    if (item.id) {
      payloadItem.id = item.id;
    }
    return payloadItem;
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
  if (typeof (supabase as any).from !== "function") {
    return [] as Pick<BudgetRow, "id" | "year" | "month" | "to_budget_cents">[];
  }
  const { data, error } = await supabase
    .from("budgets")
    .select("id, year, month, to_budget_cents")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Pick<BudgetRow, "id" | "year" | "month" | "to_budget_cents">[];
}

export function calculateToBeBudgeted(
  inflowsCents: number,
  categories: Pick<BudgetAllocationView, "budgeted_cents">[],
  reservedAdjustmentsCents = 0,
  carryoverAdjustmentsCents = 0
) {
  const totalBudgeted = categories.reduce((acc, item) => acc + (item.budgeted_cents ?? 0), 0);
  return (
    inflowsCents - totalBudgeted - reservedAdjustmentsCents + carryoverAdjustmentsCents
  );
}

function safeNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function listBudgetGoals() {
  if (typeof (supabase as any).from !== "function") return [] as BudgetGoal[];
  const { data, error } = await supabase.from("budget_goals").select("*");
  if (error) {
    if ((error as any)?.code === "42P01") {
      return [];
    }
    throw error;
  }
  return (data ?? []) as BudgetGoal[];
}

async function calculateRollingAverages(
  year: number,
  month: number,
  span = 3
): Promise<{ averageBudgetedMap: Record<string, number>; averageActivityMap: Record<string, number> }>
{
  let considered = 0;
  const totalsBudgeted: Record<string, number> = {};
  const totalsActivity: Record<string, number> = {};
  let cursor = previousMonth(year, month);
  for (let i = 0; i < span; i += 1) {
    const budget = await fetchBudget(cursor.year, cursor.month);
    if (!budget) break;
    considered += 1;
    for (const item of budget.budget_categories) {
      const key = categoryKey(item.category_id);
      totalsBudgeted[key] = (totalsBudgeted[key] ?? 0) + safeNumber(item.budgeted_cents);
      totalsActivity[key] = (totalsActivity[key] ?? 0) + safeNumber(item.activity_cents);
    }
    cursor = previousMonth(cursor.year, cursor.month);
  }
  if (considered === 0) {
    return { averageBudgetedMap: {}, averageActivityMap: {} };
  }
  const averageBudgetedMap: Record<string, number> = {};
  for (const [key, value] of Object.entries(totalsBudgeted)) {
    averageBudgetedMap[key] = Math.round(value / considered);
  }
  const averageActivityMap: Record<string, number> = {};
  for (const [key, value] of Object.entries(totalsActivity)) {
    averageActivityMap[key] = Math.round(value / considered);
  }
  return { averageBudgetedMap, averageActivityMap };
}

function mapPreviousBudgeted(previous: BudgetWithCategories | null) {
  const map: Record<string, number> = {};
  if (!previous) return map;
  for (const item of previous.budget_categories) {
    map[categoryKey(item.category_id)] = safeNumber(item.budgeted_cents);
  }
  return map;
}

export async function loadBudgetMonth(year: number, month: number): Promise<BudgetMonthEnvelope> {
  let budget = await getBudget(year, month);
  if (!budget) {
    await upsertBudget({ year, month, to_budget_cents: 0 });
    budget = await getBudget(year, month);
  }
  if (!budget) {
    throw new Error("Não foi possível carregar orçamento do mês informado");
  }

  const goals = await listBudgetGoals();
  const goalsByCategory = new Map(goals.map((goal) => [goal.category_id, goal]));

  const activityMap = await getActivityMap(year, month);
  const prevInfo = previousMonth(year, month);
  const prevBudget = await fetchBudget(prevInfo.year, prevInfo.month);
  const prevMap = new Map<string, number>();
  if (prevBudget) {
    for (const item of prevBudget.budget_categories) {
      prevMap.set(categoryKey(item.category_id), safeNumber(item.available_cents));
    }
  }

  const categories: BudgetAllocationView[] = budget.budget_categories
    .map((item) => {
      const key = categoryKey(item.category_id);
      const prevAvailable = item.rollover ? prevMap.get(key) ?? 0 : 0;
      const activity = safeNumber(activityMap[key] ?? item.activity_cents);
      const available = computeAvailable(prevAvailable, safeNumber(item.budgeted_cents), activity);
      const goal = item.category_id ? goalsByCategory.get(item.category_id) ?? null : null;
      return {
        id: item.id,
        category_id: item.category_id,
        group_name: resolveGroupName(item),
        name: budgetCategoryName(item),
        color: budgetCategoryColor(item),
        budgeted_cents: safeNumber(item.budgeted_cents),
        activity_cents: activity,
        available_cents: available,
        prev_available_cents: prevAvailable,
        rollover: item.rollover,
        goal
      } satisfies BudgetAllocationView;
    })
    .sort((a, b) => {
      const groupCompare = compareGroup(a.group_name, b.group_name);
      if (groupCompare !== 0) return groupCompare;
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
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

  const overspentLastMonth = prevBudget
    ? prevBudget.budget_categories.reduce((acc, item) => {
        const value = safeNumber(item.available_cents);
        if (value < 0 && item.rollover) return acc + Math.abs(value);
        return acc;
      }, 0)
    : 0;

  const inflows = safeNumber(budget.to_budget_cents);
  const toBeBudgeted = calculateToBeBudgeted(inflows, categories);

  const summary: BudgetMonthSummary = {
    budgetId: budget.id,
    year,
    month,
    funds_for_month_cents: inflows,
    overspent_last_month_cents: overspentLastMonth,
    budgeted_in_month_cents: totals.budgeted,
    budgeted_in_future_cents: 0,
    inflows_cents: inflows,
    to_be_budgeted_cents: toBeBudgeted
  };

  const previousBudgetedMap = mapPreviousBudgeted(prevBudget);
  const previousActivityMap = await getActivityMap(prevInfo.year, prevInfo.month);
  const { averageBudgetedMap, averageActivityMap } = await calculateRollingAverages(year, month, 3);

  return {
    summary,
    categories,
    previousBudgetedMap,
    previousActivityMap,
    averageBudgetedMap,
    averageActivityMap
  };
}

export const budgetViewInternals = {
  calculateRollingAverages
};
