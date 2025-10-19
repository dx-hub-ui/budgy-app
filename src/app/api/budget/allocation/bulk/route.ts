import { NextRequest, NextResponse } from "next/server";
import type { PostgrestResponse } from "@supabase/supabase-js";

import {
  calcularDisponivel,
  ensureBudgetSchema,
  getContext,
  handleError,
  previousMonth,
  toMonthDate,
  withFetchRetry
} from "../../utils";

type AllocationRow = {
  category_id: string;
  month: string;
  assigned_cents: number | null;
  activity_cents: number | null;
  available_cents: number | null;
};

type PreviousAllocationRow = {
  category_id: string;
  available_cents: number | null;
};

type BulkAssignmentPayload = {
  month: string;
  assignments: Array<{
    categoryId: string;
    assigned_cents: number;
  }>;
};

type BulkResponse = {
  allocations: Array<{
    category_id: string;
    month: string;
    assigned_cents: number;
    activity_cents: number;
    available_cents: number;
    prev_available_cents: number;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<BulkAssignmentPayload>;
    const monthParam = typeof body.month === "string" ? body.month.slice(0, 7) : null;
    if (!monthParam) {
      return NextResponse.json({ message: "Informe o mês" }, { status: 400 });
    }

    if (!Array.isArray(body.assignments)) {
      return NextResponse.json({ message: "Informe as categorias" }, { status: 400 });
    }

    if (body.assignments.length === 0) {
      return NextResponse.json<BulkResponse>({ allocations: [] });
    }

    const assignments = body.assignments.filter(
      (item): item is { categoryId: string; assigned_cents: number } =>
        typeof item?.categoryId === "string" && typeof item?.assigned_cents === "number"
    );

    if (assignments.length === 0) {
      return NextResponse.json({ message: "Informe categorias válidas" }, { status: 400 });
    }

    const categoryIds = Array.from(new Set(assignments.map((item) => item.categoryId)));

    if (categoryIds.length === 0) {
      return NextResponse.json<BulkResponse>({ allocations: [] });
    }
    const { supabase, orgId } = await getContext();
    await ensureBudgetSchema(supabase);

    const monthDate = toMonthDate(monthParam);
    const prevMonthKey = previousMonth(monthParam);
    const prevMonthDate = toMonthDate(prevMonthKey);

    const [current, previous] = await Promise.all([
      withFetchRetry<PostgrestResponse<AllocationRow>>(() =>
        supabase
          .from("budget_allocation")
          .select("category_id,month,assigned_cents,activity_cents,available_cents")
          .eq("org_id", orgId)
          .eq("month", monthDate)
          .in("category_id", categoryIds)
      ),
      withFetchRetry<PostgrestResponse<PreviousAllocationRow>>(() =>
        supabase
          .from("budget_allocation")
          .select("category_id,available_cents")
          .eq("org_id", orgId)
          .eq("month", prevMonthDate)
          .in("category_id", categoryIds)
      )
    ]);

    if (current.error) throw current.error;
    if (previous.error) throw previous.error;

    const currentMap = new Map(current.data?.map((row) => [row.category_id, row] as const));
    const previousMap = new Map(previous.data?.map((row) => [row.category_id, row] as const));

    const payload = assignments.map((assignment) => {
      const rounded = Math.round(assignment.assigned_cents);
      const currentRow = currentMap.get(assignment.categoryId);
      const prevRow = previousMap.get(assignment.categoryId);
      const prevAvailable = prevRow?.available_cents ?? 0;
      const activity = currentRow?.activity_cents ?? 0;
      const available = calcularDisponivel(prevAvailable, rounded, activity);
      return {
        org_id: orgId,
        category_id: assignment.categoryId,
        month: monthDate,
        assigned_cents: rounded,
        activity_cents: activity,
        available_cents: available,
        response: {
          category_id: assignment.categoryId,
          month: monthParam,
          assigned_cents: rounded,
          activity_cents: activity,
          available_cents: available,
          prev_available_cents: prevAvailable
        }
      };
    });

    const upsertPayload = payload.map(({ response, ...row }) => row);

    const { error: upsertError } = await withFetchRetry(() =>
      supabase
        .from("budget_allocation")
        .upsert(upsertPayload, { onConflict: "org_id,category_id,month" })
    );

    if (upsertError) throw upsertError;

    const allocations = payload.map((item) => item.response);

    return NextResponse.json<BulkResponse>({ allocations });
  } catch (error) {
    return handleError(error);
  }
}
