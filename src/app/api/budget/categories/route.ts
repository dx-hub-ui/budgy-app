import { NextRequest, NextResponse } from "next/server";
import { ensureSeedCategories, getContext, handleError, loadBudgetSnapshot } from "../utils";

const ym = (s?: string | null) => (s ?? "").slice(0, 7);
const currentYM = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId, userId } = await getContext();

    // loadBudgetSnapshot already seeds, but keep idempotent call safe for first-hit orgs
    await ensureSeedCategories(supabase, orgId, userId);

    const { searchParams } = new URL(request.url);
    const month = ym(searchParams.get("month") ?? searchParams.get("m") ?? currentYM());

    const snapshot = await loadBudgetSnapshot(supabase, orgId, month, userId);
    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, orgId, userId } = await getContext();

    await ensureSeedCategories(supabase, orgId, userId);

    const body = await request.json().catch(() => ({} as any));
    const month = ym(body.month ?? body.m ?? currentYM());

    const snapshot = await loadBudgetSnapshot(supabase, orgId, month, userId);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
