import { NextRequest, NextResponse } from "next/server";

import type { PostgrestMaybeSingleResponse, PostgrestSingleResponse } from "@supabase/supabase-js";

import type { BudgetCategory } from "@/domain/budgeting";

import { ensureBudgetSchema, getContext, handleError, withFetchRetry } from "../utils";

export async function POST(request: NextRequest) {
  try {
    const { supabase, orgId } = await getContext();
    await ensureBudgetSchema(supabase);

    const body = await request.json().catch(() => ({}));
    const groupName = typeof body.group_name === "string" ? body.group_name.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const icon = typeof body.icon === "string" && body.icon.trim().length > 0 ? body.icon.trim() : null;

    if (!groupName) {
      return NextResponse.json({ message: "Informe o grupo da categoria" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ message: "Informe um nome válido" }, { status: 400 });
    }

    type SortRow = { sort: number | null };
    const { data: lastSortRow, error: lastSortError } = await withFetchRetry<
      PostgrestMaybeSingleResponse<SortRow>
    >(() =>
      supabase
        .from("budget_categories")
        .select("sort")
        .eq("org_id", orgId)
        .eq("group_name", groupName)
        .order("sort", { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    if (lastSortError) throw lastSortError;

    const nextSort = (lastSortRow?.sort ?? 0) + 100;

    const { data, error } = await supabase
      .from("budget_categories")
      .insert({
        org_id: orgId,
        group_name: groupName,
        name,
        icon,
        sort: nextSort
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
