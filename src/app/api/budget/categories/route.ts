import { NextRequest, NextResponse } from "next/server";

import { ensureSeedCategories, getContext, handleError, loadBudgetSnapshot } from "../utils";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId } = getContext();
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month") ?? searchParams.get("m") ?? currentMonth();
    const monthKey = monthParam.slice(0, 7);
    const snapshot = await loadBudgetSnapshot(supabase, orgId, monthKey);
    return NextResponse.json(snapshot);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, orgId } = getContext();
    await ensureSeedCategories(supabase, orgId);
    const body = await request.json().catch(() => ({}));
    const monthParam = body.month ?? currentMonth();
    const snapshot = await loadBudgetSnapshot(supabase, orgId, monthParam);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
