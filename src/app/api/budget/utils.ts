// src/app/api/budget/utils.ts
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_ORG_ID,
  createServerSupabaseClient,
  resolveOrgId,
  resolveUserId
} from "@/lib/supabaseServer";

const LOG_SCOPE = "budget.categories.utils";
const log = (info: Record<string, unknown>) =>
  console.log(JSON.stringify({ scope: LOG_SCOPE, ...info }));

export function isFetchFailedError(error: unknown): boolean {
  if (!error) return false;
  const message = typeof (error as any)?.message === "string" ? (error as any).message : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("fetch failed") || normalized.includes("failed to fetch")) {
    return true;
  }
  const code = typeof (error as any)?.code === "string" ? (error as any).code.toLowerCase() : "";
  return code === "fetch_failed" || code === "fetch_error";
}

let SCHEMA_OK = false;

export type ApiContext = {
  supabase: SupabaseClient;
  orgId: string;
  userId: string | null;
};

export type BudgetSnapshotPayload = {
  month: string;
  categories: any[];
  goals: any[];
  allocations: Array<{
    category_id: string;
    month: string;
    assigned_cents: number;
    activity_cents: number;
    available_cents: number;
    prev_available_cents: number;
  }>;
  inflows_cents: number;
  ready_to_assign_cents: number;
  total_assigned_cents: number;
  total_activity_cents: number;
  total_available_cents: number;
};

export async function getContext(): Promise<ApiContext> {
  const t0 = Date.now();
  let supabase = createServerSupabaseClient();
  const userId = await resolveUserId(supabase);
  let orgId = resolveOrgId();

  log({ event: "context_resolved_ids", rawOrgId: orgId, hasUser: Boolean(userId) });

  if ((!orgId || orgId === DEFAULT_ORG_ID) && userId) {
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .single();
    if (error) {
      log({ event: "context_profiles_error", message: String(error.message) });
      throw error;
    }
    orgId = prof.org_id;
  }

  supabase = createServerSupabaseClient({ orgId });

  log({ event: "context_ready", orgId, hasUser: Boolean(userId), ms: Date.now() - t0 });
  return { supabase, orgId, userId };
}

export async function ensureBudgetSchema(client: SupabaseClient) {
  if (SCHEMA_OK) return;
  const t0 = Date.now();

  const tryOnce = async () => {
    const { error } = await client.rpc("ensure_budget_category_schema");
    if (error) {
      const message = String(error.message ?? "");
      if (message.includes('record "new" has no field "category_id"')) {
        log({ event: "ensure_schema_known_warning", message, ms: Date.now() - t0 });
        return true;
      }
      if (message.includes("fetch failed")) {
        log({ event: "ensure_schema_fetch_failed_soft", message, ms: Date.now() - t0 });
        return false;
      }
      log({ event: "ensure_schema_error_soft", message, ms: Date.now() - t0 });
      return false;
    }
    return true;
  };

  let ok = await tryOnce();
  if (!ok) {
    await new Promise((r) => setTimeout(r, 100));
    ok = await tryOnce();
  }
  if (ok) {
    SCHEMA_OK = true;
    log({ event: "ensure_schema_ok", ms: Date.now() - t0 });
  }
}

export async function withFetchRetry<T>(
  operation: () => PromiseLike<T>,
  attempts = 3,
  backoffMs = 120
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isFetchFailedError(error) || attempt === attempts - 1) {
        throw error;
      }
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("fetch failed");
}

export async function ensureSeedCategories(
  client: SupabaseClient,
  orgId: string,
  userId: string | null
) {
  const { count, error: preErr } = await client
    .from("budget_categories")
    .select("id", { head: true, count: "exact" })
    .eq("org_id", orgId)
    .is("deleted_at", null);

  if (preErr) {
    log({ event: "seed_precheck_error", orgId, message: String(preErr.message) });
    return;
  }
  if ((count ?? 0) > 0) return;

  const { error } = await client.rpc("seed_default_budget_categories", {
    p_org_id: orgId,
    p_actor: userId
  });
  if (!error) {
    log({ event: "seed_rpc_ok", orgId });
    return;
  }
  log({ event: "seed_rpc_error_soft", orgId, message: String(error.message) });

  const { data: defaults, error: defErr } = await client
    .from("default_categories")
    .select("group_name,name,icon,sort")
    .order("sort", { ascending: true });

  if (!defErr && defaults?.length) {
    const rows = defaults.map((d) => ({
      org_id: orgId,
      group_name: d.group_name,
      name: d.name,
      icon: d.icon ?? null,
      sort: d.sort ?? 0,
      is_hidden: false
    }));
    const { error: insErr } = await client.from("budget_categories").insert(rows);
    if (insErr) {
      log({ event: "seed_insert_from_defaults_error", orgId, message: String(insErr.message) });
    } else {
      log({ event: "seed_insert_from_defaults_ok", orgId, rows: rows.length });
    }
  } else {
    log({ event: "seed_defaults_empty_or_error", orgId, message: defErr ? String(defErr.message) : null });
  }
}

export function toMonthDate(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Formato de mês inválido. Utilize YYYY-MM");
  }
  return `${month}-01`;
}

export function previousMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function calcularDisponivel(prev: number, assigned: number, activity: number) {
  return prev + assigned - activity;
}

export function calcularAAtribuir(entradas: number, totalAtribuido: number) {
  return entradas - totalAtribuido;
}

export function handleError(error: any) {
  console.error(error);

  if (isFetchFailedError(error)) {
    return NextResponse.json(
      {
        message:
          "Não foi possível conectar ao Supabase. Verifique a configuração das variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
      },
      { status: 503 }
    );
  }

  const status = typeof error?.status === "number" && error.status >= 400 ? error.status : 500;
  const message = typeof error?.message === "string" && error.message.trim().length > 0 ? error.message : "Erro inesperado";

  return NextResponse.json({ message }, { status });
}

export async function loadBudgetSnapshot(
  client: SupabaseClient,
  orgId: string,
  month: string,
  userId: string | null
): Promise<BudgetSnapshotPayload> {
  const t0 = Date.now();
  const monthKey = month.slice(0, 7);
  const monthDate = toMonthDate(monthKey);
  const previousKey = previousMonth(monthKey);
  const previousDate = toMonthDate(previousKey);
  const nextKey = nextMonth(monthKey);
  const nextDate = toMonthDate(nextKey);

  log({ event: "snapshot_start", orgId, monthKey });

  await ensureBudgetSchema(client);
  await ensureSeedCategories(client, orgId, userId);

  const fetchCategories = () =>
    client
      .from("budget_categories")
      .select("id,org_id,group_name,name,icon,sort,is_hidden,deleted_at,created_at")
      .is("deleted_at", null)
      .order("group_name", { ascending: true })
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });

  let { data: categories, error: catError } = await fetchCategories();
  if (catError) {
    log({ event: "categories_error", message: String(catError.message) });
    throw catError;
  }
  log({ event: "categories_loaded", count: categories?.length ?? 0 });

  if (!categories || categories.length === 0) {
    await ensureSeedCategories(client, orgId, userId);
    const retry = await fetchCategories();
    if (retry.error) {
      log({ event: "categories_retry_error", message: String(retry.error.message) });
      throw retry.error;
    }
    categories = retry.data ?? [];
    log({ event: "categories_after_seed", count: categories.length });
  }

  const { data: goals, error: goalError } = await client.from("budget_goal").select("*");
  if (goalError) {
    log({ event: "goals_error", message: String(goalError.message) });
    throw goalError;
  }

  const { data: ledgerRows, error: ledgerError } = await client
    .from("account_transactions")
    .select("category_id, amount_cents, direction")
    .eq("org_id", orgId)
    .gte("occurred_on", monthDate)
    .lt("occurred_on", nextDate)
    .is("deleted_at", null);

  if (ledgerError) {
    log({ event: "ledger_error", message: String(ledgerError.message) });
    throw ledgerError;
  }

  const activityByCategory = new Map<string, number>();
  let uncategorizedActivity = 0;
  let inflowsFromLedger = 0;

  (ledgerRows ?? []).forEach((row) => {
    const raw = Number(row.amount_cents ?? 0);
    const amount = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
    if (amount === 0) return;
    if (row.direction === "outflow") {
      if (row.category_id) {
        activityByCategory.set(
          row.category_id,
          (activityByCategory.get(row.category_id) ?? 0) + amount
        );
      } else {
        uncategorizedActivity += amount;
      }
      return;
    }
    if (row.direction === "inflow") {
      if (row.category_id) {
        activityByCategory.set(
          row.category_id,
          (activityByCategory.get(row.category_id) ?? 0) - amount
        );
      } else {
        inflowsFromLedger += amount;
      }
    }
  });

  const [
    { data: currentAllocations, error: allocError },
    { data: prevAllocations, error: prevError },
    { data: nextAllocations, error: nextError }
  ] = await Promise.all([
    client.from("budget_allocation").select("*").eq("month", monthDate),
    client.from("budget_allocation").select("category_id, available_cents").eq("month", previousDate),
    client
      .from("budget_allocation")
      .select("category_id, assigned_cents, activity_cents, available_cents")
      .eq("month", nextDate)
  ]);

  if (allocError) {
    log({ event: "alloc_error", message: String(allocError.message) });
    throw allocError;
  }
  if (prevError) {
    log({ event: "prev_alloc_error", message: String(prevError.message) });
    throw prevError;
  }
  if (nextError) {
    log({ event: "next_alloc_error", message: String(nextError.message) });
    throw nextError;
  }

  log({
    event: "alloc_loaded",
    current: currentAllocations?.length ?? 0,
    prev: prevAllocations?.length ?? 0,
    next: nextAllocations?.length ?? 0
  });

  const prevAvailableMap = new Map<string, number>();
  (prevAllocations ?? []).forEach((row) => {
    prevAvailableMap.set(row.category_id, row.available_cents ?? 0);
  });

  const nextAllocationMap = new Map<
    string,
    { assigned_cents: number; activity_cents: number; available_cents: number }
  >();
  (nextAllocations ?? []).forEach((row) => {
    nextAllocationMap.set(row.category_id, {
      assigned_cents: row.assigned_cents ?? 0,
      activity_cents: row.activity_cents ?? 0,
      available_cents: row.available_cents ?? 0
    });
  });

  const allocationsByCategory = new Map<string, any>();
  (currentAllocations ?? []).forEach((row) => {
    allocationsByCategory.set(row.category_id, row);
  });

  const allocations: BudgetSnapshotPayload["allocations"] = [];
  const rowsToSync: Array<{
    org_id: string;
    category_id: string;
    month: string;
    assigned_cents: number;
    activity_cents: number;
    available_cents: number;
  }> = [];
  const availableByCategory = new Map<string, number>();
  let totalAssigned = 0;
  let totalActivity = 0;
  let totalAvailable = 0;

  (categories ?? []).forEach((category) => {
    const existing = allocationsByCategory.get(category.id);
    const prevAvailable = prevAvailableMap.get(category.id) ?? 0;
    const assigned = existing?.assigned_cents ?? 0;
    const activity = Math.round(activityByCategory.get(category.id) ?? 0);
    const available = calcularDisponivel(prevAvailable, assigned, activity);

    allocations.push({
      category_id: category.id,
      month: monthKey,
      assigned_cents: assigned,
      activity_cents: activity,
      available_cents: available,
      prev_available_cents: prevAvailable
    });

    availableByCategory.set(category.id, available);

    totalAssigned += assigned;
    totalActivity += activity;
    totalAvailable += available;

    const existingActivity = Math.round(existing?.activity_cents ?? 0);
    const existingAvailable = Math.round(existing?.available_cents ?? 0);
    if (!existing || existingActivity !== activity || existingAvailable !== available) {
      rowsToSync.push({
        org_id: orgId,
        category_id: category.id,
        month: monthDate,
        assigned_cents: assigned,
        activity_cents: activity,
        available_cents: available
      });
    }
  });

  totalActivity += uncategorizedActivity;

  log({
    event: "alloc_build",
    categories: categories.length,
    toUpsertNow: rowsToSync.length,
    totals: { assigned: totalAssigned, activity: totalActivity, available: totalAvailable }
  });

  if (rowsToSync.length > 0) {
    const { error: insertMissingError } = await client
      .from("budget_allocation")
      .upsert(rowsToSync, { onConflict: "org_id,category_id,month" });
    if (insertMissingError) {
      log({ event: "alloc_upsert_current_error", message: String(insertMissingError.message) });
      throw insertMissingError;
    }
    log({ event: "alloc_upsert_current_ok", rows: rowsToSync.length });
  }

  const backgroundPromises: Promise<void>[] = [];

  const prevMissingRows = (categories ?? [])
    .filter((category) => !prevAvailableMap.has(category.id))
    .map((category) => ({
      org_id: orgId,
      category_id: category.id,
      month: previousDate,
      assigned_cents: 0,
      activity_cents: 0,
      available_cents: 0
    }));

  if (prevMissingRows.length > 0) {
    backgroundPromises.push(
      (async () => {
        try {
          const { error } = await client
            .from("budget_allocation")
            .upsert(prevMissingRows, { onConflict: "org_id,category_id,month" });
          if (error) throw error;
          log({ event: "alloc_upsert_prev_ok", rows: prevMissingRows.length });
        } catch (error: any) {
          log({ event: "alloc_upsert_prev_error", message: String(error?.message ?? error) });
        }
      })()
    );
  }

  const nextUpsertRows = (categories ?? [])
    .map((category) => {
      const carryover = availableByCategory.get(category.id) ?? 0;
      const existingNext = nextAllocationMap.get(category.id);
      const assignedNext = existingNext?.assigned_cents ?? 0;
      const activityNext = existingNext?.activity_cents ?? 0;
      const desiredAvailable = calcularDisponivel(carryover, assignedNext, activityNext);

      if (!existingNext || existingNext.available_cents !== desiredAvailable) {
        return {
          org_id: orgId,
          category_id: category.id,
          month: nextDate,
          assigned_cents: assignedNext,
          activity_cents: activityNext,
          available_cents: desiredAvailable
        };
      }
      return null;
    })
    .filter(
      (
        row
      ): row is {
        org_id: string;
        category_id: string;
        month: string;
        assigned_cents: number;
        activity_cents: number;
        available_cents: number;
      } => row !== null
    );

  if (nextUpsertRows.length > 0) {
    backgroundPromises.push(
      (async () => {
        try {
          const { error } = await client
            .from("budget_allocation")
            .upsert(nextUpsertRows, { onConflict: "org_id,category_id,month" });
          if (error) throw error;
          log({ event: "alloc_upsert_next_ok", rows: nextUpsertRows.length });
        } catch (error: any) {
          log({ event: "alloc_upsert_next_error", message: String(error?.message ?? error) });
        }
      })()
    );
  }

  if (backgroundPromises.length > 0) {
    await Promise.allSettled(backgroundPromises);
  }

  const inflows = inflowsFromLedger;
  const ready = calcularAAtribuir(inflows, totalAssigned);

  const snapshot = {
    month: monthKey,
    categories: categories ?? [],
    goals: goals ?? [],
    allocations,
    inflows_cents: inflows,
    ready_to_assign_cents: ready,
    total_assigned_cents: totalAssigned,
    total_activity_cents: totalActivity,
    total_available_cents: totalAvailable
  };

  log({
    event: "snapshot_done",
    orgId,
    monthKey,
    categories: snapshot.categories.length,
    goals: snapshot.goals.length,
    allocations: snapshot.allocations.length,
    ms: Date.now() - t0
  });

  return snapshot;
}
