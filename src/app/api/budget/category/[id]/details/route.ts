import { NextRequest, NextResponse } from "next/server";

import {
  ensureBudgetSchema,
  getContext,
  handleError,
  nextMonth,
  previousMonth,
  toMonthDate
} from "../../../utils";

const MONTHS_FOR_AVERAGE = 3;

type AllocationRow = {
  assigned_cents: number | null;
  activity_cents: number | null;
  available_cents: number | null;
};

type TransactionRow = {
  occurred_on: string | null;
  amount_cents: number | null;
  direction: "outflow" | "inflow" | null;
};

function currentMonthKey() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function sanitizeMonth(input: string | null) {
  if (!input) return currentMonthKey();
  const match = input.match(/^(\d{4})-(\d{2})/);
  if (!match) return currentMonthKey();
  return `${match[1]}-${match[2]}`;
}

function subtractMonths(month: string, amount: number) {
  let cursor = month;
  for (let i = 0; i < amount; i += 1) {
    cursor = previousMonth(cursor);
  }
  return cursor;
}

function monthFromDate(date: string | null) {
  if (!date) return null;
  return date.slice(0, 7);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const monthKey = sanitizeMonth(searchParams.get("month"));
    const monthDate = toMonthDate(monthKey);
    const prevKey = previousMonth(monthKey);
    const prevDate = toMonthDate(prevKey);
    const nextKey = nextMonth(monthKey);
    const nextDate = toMonthDate(nextKey);

    const { supabase, orgId } = await getContext();
    await ensureBudgetSchema(supabase);

    const categoryId = params.id;

    const [{ data: categoryRow, error: categoryError }, { data: currentAlloc, error: currentError }, { data: prevAlloc, error: prevError }] =
      await Promise.all([
        supabase
          .from("budget_categories")
          .select("note")
          .eq("org_id", orgId)
          .eq("id", categoryId)
          .maybeSingle(),
        supabase
          .from("budget_allocation")
          .select("assigned_cents, activity_cents, available_cents")
          .eq("org_id", orgId)
          .eq("category_id", categoryId)
          .eq("month", monthDate)
          .maybeSingle(),
        supabase
          .from("budget_allocation")
          .select("assigned_cents, activity_cents, available_cents")
          .eq("org_id", orgId)
          .eq("category_id", categoryId)
          .eq("month", prevDate)
          .maybeSingle()
      ]);

    if (categoryError) throw categoryError;
    if (currentError) throw currentError;
    if (prevError) throw prevError;

    const monthsForAverage: string[] = [];
    for (let i = 0; i < MONTHS_FOR_AVERAGE; i += 1) {
      monthsForAverage.push(subtractMonths(monthKey, i));
    }

    const oldestMonth = monthsForAverage[monthsForAverage.length - 1];
    const rangeStart = toMonthDate(oldestMonth);

    const [{ data: multiAlloc, error: averageAllocError }, { data: transactions, error: txError }] = await Promise.all([
      supabase
        .from("budget_allocation")
        .select("month, assigned_cents, activity_cents")
        .eq("org_id", orgId)
        .eq("category_id", categoryId)
        .in(
          "month",
          monthsForAverage.map((key) => toMonthDate(key))
        ),
      supabase
        .from("account_transactions")
        .select("occurred_on, amount_cents, direction")
        .eq("org_id", orgId)
        .eq("category_id", categoryId)
        .eq("direction", "outflow")
        .is("deleted_at", null)
        .gte("occurred_on", rangeStart)
        .lt("occurred_on", nextDate)
    ]);

    if (averageAllocError) throw averageAllocError;
    if (txError) throw txError;

    const current: AllocationRow | null = currentAlloc;
    const previous: AllocationRow | null = prevAlloc;

    const byMonthAssigned = new Map<string, number>();
    const byMonthSpent = new Map<string, number>();

    monthsForAverage.forEach((key) => {
      byMonthAssigned.set(key, 0);
      byMonthSpent.set(key, 0);
    });

    (multiAlloc ?? []).forEach((row) => {
      const key = monthFromDate(row.month) ?? "";
      if (!key || !byMonthAssigned.has(key)) return;
      byMonthAssigned.set(key, (row.assigned_cents ?? 0) + (byMonthAssigned.get(key) ?? 0));
    });

    (transactions ?? []).forEach((row: TransactionRow) => {
      const key = monthFromDate(row.occurred_on);
      if (!key || !byMonthSpent.has(key)) return;
      byMonthSpent.set(key, (row.amount_cents ?? 0) + (byMonthSpent.get(key) ?? 0));
    });

    const assignedValues = monthsForAverage.map((key) => byMonthAssigned.get(key) ?? 0);
    const spentValues = monthsForAverage.map((key) => byMonthSpent.get(key) ?? 0);

    const averageAssigned = Math.round(
      assignedValues.reduce((acc, value) => acc + value, 0) / monthsForAverage.length
    );
    const averageSpent = Math.round(
      spentValues.reduce((acc, value) => acc + value, 0) / monthsForAverage.length
    );

    const cashSpending = byMonthSpent.get(monthKey) ?? 0;
    const cashSpendingLastMonth = byMonthSpent.get(prevKey) ?? 0;

    const response = {
      summary: {
        available_balance_cents: current?.available_cents ?? 0,
        cash_left_over_from_last_month_cents: previous?.available_cents ?? 0,
        assigned_this_month_cents: current?.assigned_cents ?? 0,
        cash_spending_cents: cashSpending,
        credit_spending_cents: 0
      },
      auto_assign: {
        assigned_last_month_cents: previous?.assigned_cents ?? 0,
        spent_last_month_cents: cashSpendingLastMonth,
        average_assigned_cents: averageAssigned,
        average_spent_cents: averageSpent
      },
      note: categoryRow?.note ?? null
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleError(error);
  }
}
