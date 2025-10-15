import { NextRequest, NextResponse } from "next/server";

import { calcularDisponivel, ensureBudgetSchema, getContext, handleError, previousMonth, toMonthDate } from "../utils";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.categoryId || typeof body.categoryId !== "string") {
      return NextResponse.json({ message: "Categoria inválida" }, { status: 400 });
    }
    if (typeof body.assigned_cents !== "number") {
      return NextResponse.json({ message: "Informe um valor válido" }, { status: 400 });
    }
    const monthParam = typeof body.month === "string" ? body.month.slice(0, 7) : null;
    if (!monthParam) {
      return NextResponse.json({ message: "Informe o mês" }, { status: 400 });
    }

    const { supabase, orgId } = getContext();
    await ensureBudgetSchema(supabase);
    const monthDate = toMonthDate(monthParam);
    const prevMonthKey = previousMonth(monthParam);
    const prevMonthDate = toMonthDate(prevMonthKey);

    const [{ data: current, error: currentError }, { data: previous, error: prevError }] = await Promise.all([
      supabase
        .from("budget_allocation")
        .select("*")
        .eq("org_id", orgId)
        .eq("category_id", body.categoryId)
        .eq("month", monthDate)
        .maybeSingle(),
      supabase
        .from("budget_allocation")
        .select("available_cents")
        .eq("org_id", orgId)
        .eq("category_id", body.categoryId)
        .eq("month", prevMonthDate)
        .maybeSingle()
    ]);

    if (currentError) throw currentError;
    if (prevError) throw prevError;

    const prevAvailable = previous?.available_cents ?? 0;
    const activity = current?.activity_cents ?? 0;
    const newAvailable = calcularDisponivel(prevAvailable, Math.round(body.assigned_cents), activity);

    const { data: upserted, error: upsertError } = await supabase
      .from("budget_allocation")
      .upsert(
        {
          org_id: orgId,
          category_id: body.categoryId,
          month: monthDate,
          assigned_cents: Math.round(body.assigned_cents),
          activity_cents: activity,
          available_cents: newAvailable
        },
        { onConflict: "org_id,category_id,month" }
      )
      .select("*")
      .single();

    if (upsertError) throw upsertError;

    return NextResponse.json({
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
