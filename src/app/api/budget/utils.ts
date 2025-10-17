import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_ORG_ID,
  createServerSupabaseClient,
  resolveOrgId,
  resolveUserId
} from "@/lib/supabaseServer";

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
  let supabase = createServerSupabaseClient();
  let orgId = resolveOrgId();
  const userId = await resolveUserId(supabase);

  if ((orgId === DEFAULT_ORG_ID || orgId.trim().length === 0) && userId) {
    orgId = userId;
    supabase = createServerSupabaseClient({ orgId });
  }

  return { supabase, orgId, userId };
}

export async function ensureBudgetSchema(client: SupabaseClient) {
  const { error } = await client.rpc("ensure_budget_category_schema");
  if (error) {
    const message = String(error.message ?? "");
    if (message.includes('record "new" has no field "category_id"')) {
      console.warn("Ignorando erro conhecido na rotina ensure_budget_category_schema", message);
      return;
    }
    throw error;
  }
}

export async function ensureSeedCategories(
  client: SupabaseClient,
  orgId: string,
  userId: string | null
) {
  await ensureBudgetSchema(client);
  const { error } = await client.rpc("seed_default_budget_categories", {
    p_org_id: orgId,
    p_actor: userId
  });
  if (error) throw error;
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
  return NextResponse.json(
    { message: error?.message ?? "Erro inesperado" },
    { status: error?.status ?? 500 }
  );
}

export async function loadBudgetSnapshot(
  client: SupabaseClient,
  orgId: string,
  month: string,
  userId: string | null
): Promise<BudgetSnapshotPayload> {
  await ensureSeedCategories(client, orgId, userId);
  const monthKey = month.slice(0, 7);
  const monthDate = toMonthDate(monthKey);
  const previousKey = previousMonth(monthKey);
  const previousDate = toMonthDate(previousKey);
  const nextKey = nextMonth(monthKey);
  const nextDate = toMonthDate(nextKey);

  const [{ data: categories, error: catError }, { data: goals, error: goalError }] = await Promise.all([
    client
      .from("budget_categories")
      .select("*")
      .eq("org_id", orgId)
      .order("sort", { ascending: true }),
    client.from("budget_goal").select("*").eq("org_id", orgId)
  ]);

  if (catError) throw catError;
  if (goalError) throw goalError;

  const [
    { data: currentAllocations, error: allocError },
    { data: prevAllocations, error: prevError },
    { data: nextAllocations, error: nextError }
  ] = await Promise.all([
    client
      .from("budget_allocation")
      .select("*")
      .eq("org_id", orgId)
      .eq("month", monthDate),
    client
      .from("budget_allocation")
      .select("category_id, available_cents")
      .eq("org_id", orgId)
      .eq("month", previousDate),
    client
      .from("budget_allocation")
      .select("category_id, assigned_cents, activity_cents, available_cents")
      .eq("org_id", orgId)
      .eq("month", nextDate)
  ]);

  if (allocError) throw allocError;
  if (prevError) throw prevError;
  if (nextError) throw nextError;

  const prevAvailableMap = new Map<string, number>();
  (prevAllocations ?? []).forEach((row) => {
    prevAvailableMap.set(row.category_id, row.available_cents ?? 0);
  });

  const nextAllocationMap = new Map<
    string,
    {
      assigned_cents: number;
      activity_cents: number;
      available_cents: number;
    }
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
  const missingRows: Array<{
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
    const activity = existing?.activity_cents ?? 0;
    const available = existing?.available_cents ?? calcularDisponivel(prevAvailable, assigned, activity);

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

    if (!existing) {
      missingRows.push({
        org_id: orgId,
        category_id: category.id,
        month: monthDate,
        assigned_cents: assigned,
        activity_cents: activity,
        available_cents: available
      });
    }
  });

  if (missingRows.length > 0) {
    const { error: insertMissingError } = await client
      .from("budget_allocation")
      .upsert(missingRows, { onConflict: "org_id,category_id,month" });
    if (insertMissingError) throw insertMissingError;
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
        } catch (error) {
          console.error("Erro ao preparar mês anterior do orçamento", error);
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
        } catch (error) {
          console.error("Erro ao preparar próximo mês do orçamento", error);
        }
      })()
    );
  }

  if (backgroundPromises.length > 0) {
    await Promise.allSettled(backgroundPromises);
  }

  const inflows = totalAssigned;
  const ready = calcularAAtribuir(inflows, totalAssigned);

  return {
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
}
