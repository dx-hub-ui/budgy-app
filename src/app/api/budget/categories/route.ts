import { NextRequest, NextResponse } from "next/server";
import { ensureSeedCategories, getContext, handleError, loadBudgetSnapshot } from "../utils";

const ym = (s?: string | null) => (s ?? "").slice(0, 7);
const currentYM = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

function log(info: Record<string, unknown>) {
  // Log compacto e parseável
  console.log(JSON.stringify({ scope: "budget.categories.route", ...info }));
}

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  try {
    const { supabase, orgId, userId } = await getContext();
    const { searchParams } = new URL(request.url);
    const month = ym(searchParams.get("month") ?? searchParams.get("m") ?? currentYM());

    log({ event: "GET_start", orgId, hasUser: Boolean(userId), month });

    const snapshot = await loadBudgetSnapshot(supabase, orgId, month, userId);

    log({
      event: "GET_ok",
      orgId,
      month,
      categories: snapshot?.categories?.length ?? 0,
      goals: snapshot?.goals?.length ?? 0,
      allocations: snapshot?.allocations?.length ?? 0,
      ms: Date.now() - t0
    });

    return NextResponse.json(snapshot, { status: 200 });
  } catch (error: any) {
    log({
      event: "GET_error",
      message: String(error?.message ?? error),
      code: error?.code ?? error?.status ?? 500,
      ms: Date.now() - t0
    });
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  try {
    const { supabase, orgId, userId } = await getContext();
    const body = await request.json().catch(() => ({} as any));
    const month = ym(body.month ?? body.m ?? currentYM());

    log({ event: "POST_start", orgId, hasUser: Boolean(userId), month });

    const snapshot = await loadBudgetSnapshot(supabase, orgId, month, userId);

    log({
      event: "POST_ok",
      orgId,
      month,
      categories: snapshot?.categories?.length ?? 0,
      goals: snapshot?.goals?.length ?? 0,
      allocations: snapshot?.allocations?.length ?? 0,
      ms: Date.now() - t0
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error: any) {
    log({
      event: "POST_error",
      message: String(error?.message ?? error),
      code: error?.code ?? error?.status ?? 500,
      ms: Date.now() - t0
    });
    return handleError(error);
  }
}
