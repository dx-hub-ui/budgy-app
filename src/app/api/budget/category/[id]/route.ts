import { NextRequest, NextResponse } from "next/server";

import { ensureBudgetSchema, getContext, handleError } from "../../utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, orgId } = getContext();
    await ensureBudgetSchema(supabase);
    const body = await request.json();
    const updates: Record<string, any> = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json(
          { message: "Informe um nome válido" },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    if ("is_hidden" in body) {
      updates.is_hidden = Boolean(body.is_hidden);
    }

    if ("deleted_at" in body) {
      updates.deleted_at = body.deleted_at ? new Date(body.deleted_at).toISOString() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("budget_category")
      .update(updates)
      .eq("org_id", orgId)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}
