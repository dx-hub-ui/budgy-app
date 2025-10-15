import { NextRequest, NextResponse } from "next/server";

import { ensureBudgetSchema, getContext, handleError, toMonthDate } from "../../utils";

const GOAL_TYPES = new Set(["TB", "TBD", "MFG", "CUSTOM"]);
const CADENCES = new Set(["weekly", "monthly", "yearly", "custom"]);

export async function PUT(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const body = await request.json();
    if (!GOAL_TYPES.has(body.type)) {
      return NextResponse.json({ message: "Tipo de meta inválido" }, { status: 400 });
    }
    if (typeof body.amount_cents !== "number" || body.amount_cents < 0) {
      return NextResponse.json({ message: "Informe um valor válido" }, { status: 400 });
    }

    const { supabase, orgId } = getContext();
    await ensureBudgetSchema(supabase);

    const payload: Record<string, any> = {
      org_id: orgId,
      category_id: params.categoryId,
      type: body.type,
      amount_cents: Math.round(body.amount_cents)
    };

    if (body.target_month) {
      payload.target_month = toMonthDate(body.target_month.slice(0, 7));
    }
    if (body.cadence) {
      if (!CADENCES.has(body.cadence)) {
        return NextResponse.json({ message: "Cadência inválida" }, { status: 400 });
      }
      payload.cadence = body.cadence;
    }

    const { data, error } = await supabase
      .from("budget_goal")
      .upsert(payload, { onConflict: "org_id,category_id" })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { supabase, orgId } = getContext();
    await ensureBudgetSchema(supabase);
    const { error } = await supabase
      .from("budget_goal")
      .delete()
      .eq("org_id", orgId)
      .eq("category_id", params.categoryId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
