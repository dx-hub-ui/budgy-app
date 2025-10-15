import { NextRequest, NextResponse } from "next/server";

import {
  calcularDisponivel,
  ensureBudgetSchema,
  getContext,
  handleError,
  previousMonth,
  toMonthDate
} from "../../../utils";

const GOAL_TYPES = new Set(["TB", "TBD", "MFG", "CUSTOM"]);

function compareMonth(a: string, b: string) {
  return a.localeCompare(b);
}

function monthsBetween(start: string, end: string) {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const body = await request.json();
    const monthParam = typeof body.month === "string" ? body.month.slice(0, 7) : null;
    if (!monthParam) {
      return NextResponse.json({ message: "Informe o mês" }, { status: 400 });
    }

    const { supabase, orgId } = getContext();
    await ensureBudgetSchema(supabase);
    const { data: goal, error: goalError } = await supabase
      .from("budget_goal")
      .select("*")
      .eq("org_id", orgId)
      .eq("category_id", params.categoryId)
      .maybeSingle();

    if (goalError) throw goalError;
    if (!goal || !GOAL_TYPES.has(goal.type)) {
      return NextResponse.json({ message: "Meta não encontrada" }, { status: 404 });
    }

    const monthDate = toMonthDate(monthParam);
    const prevMonthKey = previousMonth(monthParam);
    const prevMonthDate = toMonthDate(prevMonthKey);

    const [{ data: allocation, error: allocationError }, { data: prevAllocation, error: prevError }] =
      await Promise.all([
        supabase
          .from("budget_allocation")
          .select("*")
          .eq("org_id", orgId)
          .eq("category_id", params.categoryId)
          .eq("month", monthDate)
          .maybeSingle(),
        supabase
          .from("budget_allocation")
          .select("available_cents")
          .eq("org_id", orgId)
          .eq("category_id", params.categoryId)
          .eq("month", prevMonthDate)
          .maybeSingle()
      ]);

    if (allocationError) throw allocationError;
    if (prevError) throw prevError;

    const prevAvailable = prevAllocation?.available_cents ?? 0;
    const assigned = allocation?.assigned_cents ?? 0;
    const activity = allocation?.activity_cents ?? 0;
    const available = allocation?.available_cents ?? calcularDisponivel(prevAvailable, assigned, activity);

    let diff = 0;

    switch (goal.type) {
      case "MFG": {
        diff = Math.max(goal.amount_cents - assigned, 0);
        break;
      }
      case "TB": {
        diff = Math.max(goal.amount_cents - available, 0);
        break;
      }
      case "TBD": {
        if (!goal.target_month) {
          diff = 0;
        } else {
          const targetKey = goal.target_month.slice(0, 7);
          if (compareMonth(monthParam, targetKey) > 0) {
            diff = 0;
          } else {
            const remainingMonths = Math.max(1, monthsBetween(monthParam, targetKey) + 1);
            const saldoNecessario = Math.max(goal.amount_cents - available, 0);
            const necessarioMes = Math.ceil(saldoNecessario / remainingMonths);
            diff = Math.max(necessarioMes - assigned, 0);
          }
        }
        break;
      }
      case "CUSTOM": {
        diff = Math.max(goal.amount_cents - assigned, 0);
        break;
      }
      default: {
        diff = 0;
      }
    }

    if (diff <= 0) {
      return NextResponse.json({
        diff_cents: 0,
        allocation: {
          category_id: params.categoryId,
          month: monthParam,
          assigned_cents: assigned,
          activity_cents: activity,
          available_cents: available,
          prev_available_cents: prevAvailable
        }
      });
    }

    const newAssigned = assigned + diff;
    const newAvailable = calcularDisponivel(prevAvailable, newAssigned, activity);

    const { data: upserted, error: upsertError } = await supabase
      .from("budget_allocation")
      .upsert(
        {
          org_id: orgId,
          category_id: params.categoryId,
          month: monthDate,
          assigned_cents: newAssigned,
          activity_cents: activity,
          available_cents: newAvailable
        },
        { onConflict: "org_id,category_id,month" }
      )
      .select("*")
      .single();

    if (upsertError) throw upsertError;

    return NextResponse.json({
      diff_cents: diff,
      allocation: {
        category_id: upserted.category_id,
        month: monthParam,
        assigned_cents: upserted.assigned_cents,
        activity_cents: upserted.activity_cents,
        available_cents: upserted.available_cents,
        prev_available_cents: prevAvailable
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
