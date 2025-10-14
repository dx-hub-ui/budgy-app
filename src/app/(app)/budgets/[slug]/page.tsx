"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  NULL_CATEGORY_KEY,
  budgetStatusFromTotals,
  centsToBRL,
  computeAvailable,
  copyFromPrevious,
  formatMonthLabel,
  getActivityMap,
  getBudget,
  getBudgetSummary,
  nowYM,
  suggestFromAvg3m,
  upsertBudget,
  upsertBudgetCategories
} from "@/domain/budget";
import { fmtBRL } from "@/domain/format";
import { BudgetTable, type BudgetTableItem } from "@/components/budget/BudgetTable";
import { ActionsBar } from "@/components/budget/ActionsBar";
import { Badge } from "@/components/ui/Badge";
import { FieldCurrency } from "@/components/ui/FieldCurrency";

function previousMonth(year: number, month: number) {
  const m = month - 1;
  if (m >= 1) return { year, month: m };
  return { year: year - 1, month: 12 };
}

function nextMonth(year: number, month: number) {
  const m = month + 1;
  if (m <= 12) return { year, month: m };
  return { year: year + 1, month: 1 };
}

type ToastState = { type: "success" | "error"; message: string } | null;

type BudgetHeader = {
  id: string;
  to_budget_cents: number;
};

function categoryName(item: any) {
  if (item.category) return item.category.name;
  if (!item.category_id) return "Sem categoria";
  return "Categoria removida";
}

function categoryColor(item: any) {
  if (item.category && item.category.color) return item.category.color;
  return "var(--cc-primary)";
}

export default function BudgetMonthPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const parsed = useMemo(() => {
    if (!slug) return null;
    const [yearStr, monthStr] = slug.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }
    return { year, month };
  }, [slug]);

  const [header, setHeader] = useState<BudgetHeader | null>(null);
  const [items, setItems] = useState<BudgetTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const target = parsed;
    if (!target) {
      setError("Data inválida");
      setLoading(false);
      return;
    }
    const { year: targetYear, month: targetMonth } = target;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        let budget = await getBudget(targetYear, targetMonth);
        if (!budget) {
          await upsertBudget({
            year: targetYear,
            month: targetMonth,
            to_budget_cents: 0
          });
          budget = await getBudget(targetYear, targetMonth);
        }
        if (!budget) throw new Error("Não foi possível carregar orçamento");
        const activityMap = await getActivityMap(targetYear, targetMonth);
        const prevInfo = previousMonth(targetYear, targetMonth);
        const prev = await getBudget(prevInfo.year, prevInfo.month);
        const prevMap = new Map<string, number>();
        if (prev) {
          for (const item of prev.budget_categories) {
            const key = item.category_id ?? NULL_CATEGORY_KEY;
            prevMap.set(key, item.available_cents ?? 0);
          }
        }
        const tableItems: BudgetTableItem[] = budget.budget_categories.map((item) => {
          const key = item.category_id ?? NULL_CATEGORY_KEY;
          const activity = activityMap[key] ?? item.activity_cents ?? 0;
          const prevAvailable = item.rollover ? prevMap.get(key) ?? 0 : 0;
          const available = computeAvailable(prevAvailable, item.budgeted_cents, activity);
          return {
            id: item.id,
            category_id: item.category_id,
            name: categoryName(item),
            color: categoryColor(item),
            budgeted_cents: item.budgeted_cents,
            activity_cents: activity,
            available_cents: available,
            rollover: item.rollover,
            prev_available_cents: prevAvailable
          };
        });
        tableItems.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
        setItems(tableItems);
        setHeader({ id: budget.id, to_budget_cents: budget.to_budget_cents });
      } catch (err: any) {
        setError(err.message ?? "Falha ao carregar orçamento");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [parsed]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.budgeted += item.budgeted_cents;
        acc.activity += item.activity_cents;
        acc.available += item.available_cents;
        return acc;
      },
      { budgeted: 0, activity: 0, available: 0 }
    );
  }, [items]);

  const toBudget = header?.to_budget_cents ?? 0;
  const toAssign = toBudget - totals.budgeted;
  const toAssignBadge = toAssign === 0 ? "success" : toAssign > 0 ? "warning" : "danger";
  const spendingStatus = budgetStatusFromTotals(totals);

  function updateItem(id: string, patch: Partial<BudgetTableItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const budgeted = patch.budgeted_cents ?? item.budgeted_cents;
        const activity = patch.activity_cents ?? item.activity_cents;
        const rollover = patch.rollover ?? item.rollover;
        const prevAvailable = rollover ? item.prev_available_cents : 0;
        const available = computeAvailable(prevAvailable, budgeted, activity);
        return {
          ...item,
          ...patch,
          budgeted_cents: budgeted,
          activity_cents: activity,
          rollover,
          available_cents: available
        };
      })
    );
  }

  function toggleRollover(id: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const rollover = !item.rollover;
        const prevAvailable = rollover ? item.prev_available_cents : 0;
        const available = computeAvailable(prevAvailable, item.budgeted_cents, item.activity_cents);
        return { ...item, rollover, available_cents: available };
      })
    );
  }

  async function reload() {
    if (!parsed) return;
    setLoading(true);
    try {
      const summary = await getBudgetSummary(parsed.year, parsed.month);
      if (!summary) return;
      const activityMap = await getActivityMap(parsed.year, parsed.month);
      const prevInfo = previousMonth(parsed.year, parsed.month);
      const prevBudget = await getBudget(prevInfo.year, prevInfo.month);
      const prevMap = new Map<string, number>();
      if (prevBudget) {
        for (const item of prevBudget.budget_categories) {
          prevMap.set(item.category_id ?? NULL_CATEGORY_KEY, item.available_cents ?? 0);
        }
      }
      const refreshed: BudgetTableItem[] = summary.budget.budget_categories.map((item) => {
        const key = item.category_id ?? NULL_CATEGORY_KEY;
        const activity = activityMap[key] ?? item.activity_cents ?? 0;
        const prevAvailable = item.rollover ? prevMap.get(key) ?? 0 : 0;
        const available = computeAvailable(prevAvailable, item.budgeted_cents, activity);
        return {
          id: item.id,
          category_id: item.category_id,
          name: categoryName(item),
          color: categoryColor(item),
          budgeted_cents: item.budgeted_cents,
          activity_cents: activity,
          available_cents: available,
          rollover: item.rollover,
          prev_available_cents: prevAvailable
        };
      });
      refreshed.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
      setItems(refreshed);
      setHeader({ id: summary.budget.id, to_budget_cents: summary.budget.to_budget_cents });
    } catch (err: any) {
      setError(err.message ?? "Falha ao atualizar orçamento");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyPrevious() {
    if (!parsed) return;
    try {
      setSaving(true);
      await copyFromPrevious(parsed.year, parsed.month);
      await reload();
      setToast({ type: "success", message: "Categorias copiadas do mês anterior." });
    } catch (err: any) {
      setToast({ type: "error", message: err.message ?? "Não foi possível copiar." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDistributeAvg() {
    if (!parsed) return;
    try {
      setSaving(true);
      const suggestions = await suggestFromAvg3m(parsed.year, parsed.month);
      setItems((prev) =>
        prev.map((item) => {
          const key = item.category_id ?? NULL_CATEGORY_KEY;
          if (suggestions[key] === undefined) return item;
          const budgeted = suggestions[key];
          const available = computeAvailable(
            item.rollover ? item.prev_available_cents : 0,
            budgeted,
            item.activity_cents
          );
          return { ...item, budgeted_cents: budgeted, available_cents: available };
        })
      );
      setToast({ type: "success", message: "Sugestões aplicadas com base na média de 3 meses." });
    } catch (err: any) {
      setToast({ type: "error", message: err.message ?? "Falha ao calcular médias." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!parsed || !header) return;
    try {
      setSaving(true);
      await upsertBudget({
        year: parsed.year,
        month: parsed.month,
        to_budget_cents: header.to_budget_cents
      });
      await upsertBudgetCategories(
        header.id,
        items.map((item) => ({
          id: item.id,
          category_id: item.category_id,
          budgeted_cents: item.budgeted_cents,
          rollover: item.rollover
        }))
      );
      await reload();
      setToast({ type: "success", message: "Orçamento salvo com sucesso." });
    } catch (err: any) {
      setToast({ type: "error", message: err.message ?? "Erro ao salvar orçamento." });
    } finally {
      setSaving(false);
    }
  }

  const prevLink = useMemo(() => {
    if (!parsed) return null;
    const prev = previousMonth(parsed.year, parsed.month);
    return `/budgets/${prev.year}-${String(prev.month).padStart(2, "0")}`;
  }, [parsed]);

  const nextLink = useMemo(() => {
    if (!parsed) return null;
    const next = nextMonth(parsed.year, parsed.month);
    return `/budgets/${next.year}-${String(next.month).padStart(2, "0")}`;
  }, [parsed]);

  const { year: currentYear, month: currentMonth } = nowYM();
  const isFuture = useMemo(() => {
    if (!parsed) return false;
    if (parsed.year > currentYear) return true;
    if (parsed.year === currentYear && parsed.month > currentMonth) return true;
    return false;
  }, [parsed, currentYear, currentMonth]);

  if (!parsed) {
    return (
      <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
        <p className="text-sm text-red-600">Slug inválido.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="grid gap-6 md:grid-cols-12">
        <header className="md:col-span-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={prevLink ?? "#"}
                aria-disabled={!prevLink}
                className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium"
                style={{ borderColor: "var(--cc-border)", opacity: prevLink ? 1 : 0.5 }}
              >
                ← Anterior
              </Link>
              <h1 className="text-[28px] leading-[36px] font-semibold">
                {formatMonthLabel(parsed.year, parsed.month)}
              </h1>
              <Link
                href={nextLink ?? "#"}
                aria-disabled={!nextLink}
                className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium"
                style={{ borderColor: "var(--cc-border)", opacity: nextLink ? 1 : 0.5 }}
              >
                Próximo →
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={toAssignBadge}>
                {toAssign === 0
                  ? "Tudo orçado"
                  : toAssign > 0
                  ? `${fmtBRL(toAssign)} para distribuir`
                  : `Excedido em ${fmtBRL(Math.abs(toAssign))}`}
              </Badge>
              <Badge tone={spendingStatus.tone}>{spendingStatus.label}</Badge>
              {isFuture && <Badge tone="info">Mês futuro</Badge>}
            </div>
          </div>
        </header>

        <section className="cc-card md:col-span-12">
          <div className="cc-stack-24">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="flex flex-col text-sm text-[var(--cc-text)] md:w-72">
                <span className="mb-1 font-medium">Saldo a orçar</span>
                <FieldCurrency
                  value={toBudget}
                  onChange={(value) => setHeader((prev) => (prev ? { ...prev, to_budget_cents: value } : prev))}
                  aria-label="Saldo a orçar em reais"
                />
              </label>
              <ActionsBar
                onCopyPrevious={handleCopyPrevious}
                onDistributeAvg={handleDistributeAvg}
                onSave={handleSave}
                disabled={loading || saving || !header}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            {loading ? (
              <p className="text-sm text-[var(--cc-text-muted)]">Carregando…</p>
            ) : (
              <BudgetTable items={items} onEdit={updateItem} onToggleRollover={toggleRollover} />
            )}

            <div className="mt-6 overflow-hidden rounded-lg border" style={{ borderColor: "var(--cc-border)" }}>
              <table className="min-w-full border-collapse text-sm">
                <tbody>
                  <tr className="border-b" style={{ borderColor: "var(--cc-border)" }}>
                    <td className="px-4 py-3 font-medium">Total orçado</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--cc-text)]">
                      {centsToBRL(totals.budgeted)}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: "var(--cc-border)" }}>
                    <td className="px-4 py-3 font-medium">Total gasto</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--cc-text)]">
                      {centsToBRL(totals.activity)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Total disponível</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--cc-text)]">
                      {centsToBRL(totals.available)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
