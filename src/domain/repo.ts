"use client";

import { supabase } from "@/lib/supabase";
import type { CategoryInput, ExpenseInput } from "./models";

export async function getSessionUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function listCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function upsertCategory(input: CategoryInput) {
  const { data, error } = await supabase.from("categories").upsert({ ...input }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export type MonthFilter = { year: number; month: number };
export function monthToRange({ year, month }: MonthFilter) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);
  return { s, e };
}

export async function listExpensesByMonth(f: MonthFilter) {
  const { s, e } = monthToRange(f);
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("date", s)
    .lt("date", e)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createExpense(input: ExpenseInput) {
  const { data, error } = await supabase.from("expenses").insert(input).select().single();
  if (error) throw error;
  return data;
}
