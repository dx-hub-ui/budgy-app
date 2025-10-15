"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  BudgetAllocationView,
  BudgetMonthEnvelope,
  formatMonthLabel,
  listRecentBudgets,
  loadBudgetMonth,
  nowYM,
  upsertBudget,
  upsertBudgetCategories,
  type UpsertBudgetCategoryInput
} from "@/domain/budget";
import { fmtBRL } from "@/domain/format";
import { BudgetFooterStatus } from "@/components/budget/BudgetFooterStatus";
import { BudgetGrid } from "@/components/budget/BudgetGrid";
import { SummaryPanel } from "@/components/budget/SummaryPanel";
import { TopBarBudget } from "@/components/budget/TopBarBudget";
import {
  QuickBudgetMode,
  QuickBudgetResult,
  budgetSelectors,
  useBudgetMonthStore
} from "@/stores/budgetMonthStore";

function parseMonth(value: string | null | undefined) {
  if (!value) return null;
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildMonthOptions(year: number, month: number) {
  const current = new Date(Date.UTC(year, month - 1, 1));
  const options: { value: string; label: string }[] = [];
  for (let offset = -6; offset <= 6; offset += 1) {
    const date = new Date(current);
    date.setUTCMonth(current.getUTCMonth() + offset);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const value = formatMonthKey(y, m);
    options.push({ value, label: formatMonthLabel(y, m) });
  }
  return options;
}

type ToastState = { type: "success" | "error" | "info"; message: string } | null;

type MonthState = { year: number; month: number };

function summarizeDiffs(result: QuickBudgetResult) {
  const total = result.diffs.reduce((acc, diff) => acc + diff.delta, 0);
  return {
    total,
    message:
      result.diffs.length === 0
        ? "Nenhuma alteração necessária"
        : `${result.description}: ${fmtBRL(total)} aplicados`
  };
}

export default function BudgetMonthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug ?? "";

  const parsedSlug = parseMonth(slug);
  const paramMonth = parseMonth(searchParams?.get("m"));
  const fallbackMonth = parsedSlug ?? nowYM();
  const [activeMonth, setActiveMonth] = useState<MonthState>(paramMonth ?? fallbackMonth);

  const initialize = useBudgetMonthStore((state) => state.initialize);
  const setLoading = useBudgetMonthStore((state) => state.setLoading);
  const setError = useBudgetMonthStore((state) => state.setError);
  const setSaving = useBudgetMonthStore((state) => state.setSaving);
  const markSaved = useBudgetMonthStore((state) => state.markSaved);
  const setSummaryFunds = useBudgetMonthStore((state) => state.setSummaryFunds);
  const editBudget = useBudgetMonthStore((state) => state.editBudget);
  const toggleSelection = useBudgetMonthStore((state) => state.toggleSelection);
  const replaceSelection = useBudgetMonthStore((state) => state.replaceSelection);
  const setFocused = useBudgetMonthStore((state) => state.setFocused);
  const undo = useBudgetMonthStore((state) => state.undo);
  const redo = useBudgetMonthStore((state) => state.redo);
  const applyQuickBudget = useBudgetMonthStore((state) => state.applyQuickBudget);
  const previewQuickBudget = useBudgetMonthStore((state) => state.previewQuickBudget);

  const summary = budgetSelectors.useSummary();
  const categories = budgetSelectors.useCategories();
  const selection = budgetSelectors.useSelection();
  const focusedId = budgetSelectors.useFocusedId();
  const loading = budgetSelectors.useLoading();
  const saving = budgetSelectors.useSaving();
  const lastAction = budgetSelectors.useLastAction();
  const canUndo = budgetSelectors.useCanUndo();
  const canRedo = budgetSelectors.useCanRedo();

  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>(
    buildMonthOptions(activeMonth.year, activeMonth.month)
  );
  const [toast, setToast] = useState<ToastState>(null);

  const pendingBudgetUpdates = useRef<Map<string, number>>(new Map());
  const budgetTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingFunds = useRef<number | null>(null);
  const fundsTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentKey = formatMonthKey(activeMonth.year, activeMonth.month);
    const targetPath = `/budgets/${currentKey}?m=${currentKey}`;
    if (slug !== currentKey || searchParams?.get("m") !== currentKey) {
      router.replace(targetPath, { scroll: false });
    }
  }, [activeMonth, router, searchParams, slug]);

  useEffect(() => {
    const parsedParam = parseMonth(searchParams?.get("m"));
    if (parsedParam && (parsedParam.year !== activeMonth.year || parsedParam.month !== activeMonth.month)) {
      setActiveMonth(parsedParam);
    }
  }, [searchParams, activeMonth.year, activeMonth.month]);

  useEffect(() => {
    let cancelled = false;
    async function loadMonth() {
      if (!activeMonth) return;
      setLoading(true);
      setError(null);
      try {
        const envelope: BudgetMonthEnvelope = await loadBudgetMonth(activeMonth.year, activeMonth.month);
        if (cancelled) return;
        initialize(envelope);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "Não foi possível carregar o orçamento.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    pendingBudgetUpdates.current.clear();
    pendingFunds.current = null;
    if (budgetTimer.current) {
      clearTimeout(budgetTimer.current);
      budgetTimer.current = null;
    }
    if (fundsTimer.current) {
      clearTimeout(fundsTimer.current);
      fundsTimer.current = null;
    }
    void loadMonth();
    return () => {
      cancelled = true;
    };
  }, [activeMonth, initialize, setError, setLoading]);

  useEffect(() => {
    let ignore = false;
    async function loadOptions() {
      try {
        const recent = await listRecentBudgets(12);
        if (ignore) return;
        const mapped = recent.map((item) => ({
          value: formatMonthKey(item.year, item.month),
          label: formatMonthLabel(item.year, item.month)
        }));
        const currentKey = formatMonthKey(activeMonth.year, activeMonth.month);
        if (!mapped.some((option) => option.value === currentKey)) {
          mapped.unshift({ value: currentKey, label: formatMonthLabel(activeMonth.year, activeMonth.month) });
        }
        setMonthOptions(mapped.length > 0 ? mapped : buildMonthOptions(activeMonth.year, activeMonth.month));
      } catch {
        setMonthOptions(buildMonthOptions(activeMonth.year, activeMonth.month));
      }
    }
    void loadOptions();
    return () => {
      ignore = true;
    };
  }, [activeMonth]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";
      if (isUndo && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (isUndo) {
        event.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  async function flushBudgetUpdates(entries: Array<[string, number]>) {
    if (!summary) return;
    if (entries.length === 0) return;
    const payload: UpsertBudgetCategoryInput[] = [];
    for (const [id, value] of entries) {
      const category = categories.find((item) => item.id === id);
      if (!category) continue;
      payload.push({
        id: category.id,
        category_id: category.category_id,
        budgeted_cents: value,
        rollover: category.rollover
      });
    }
    if (payload.length === 0) return;
    setSaving(true);
    try {
      await upsertBudgetCategories(summary.budgetId, payload);
      markSaved("Categorias atualizadas");
    } catch (err: any) {
      setError(err?.message ?? "Erro ao salvar categorias");
      for (const [id, value] of entries) {
        pendingBudgetUpdates.current.set(id, value);
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function flushFundsUpdate(value: number) {
    if (!summary) return;
    setSaving(true);
    try {
      await upsertBudget({
        year: summary.year,
        month: summary.month,
        to_budget_cents: value
      });
      markSaved("Saldo a orçar salvo");
    } catch (err: any) {
      setError(err?.message ?? "Erro ao salvar saldo");
      pendingFunds.current = value;
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function scheduleBudgetSave() {
    if (budgetTimer.current) clearTimeout(budgetTimer.current);
    budgetTimer.current = setTimeout(async () => {
      const entries = Array.from(pendingBudgetUpdates.current.entries());
      pendingBudgetUpdates.current.clear();
      try {
        await flushBudgetUpdates(entries);
      } catch {
        // erro já tratado
        if (pendingBudgetUpdates.current.size > 0) {
          scheduleBudgetSave();
        }
      }
    }, 400);
  }

  function scheduleFundsSave() {
    if (fundsTimer.current) clearTimeout(fundsTimer.current);
    fundsTimer.current = setTimeout(async () => {
      const value = pendingFunds.current;
      if (value === null) return;
      pendingFunds.current = null;
      try {
        await flushFundsUpdate(value);
      } catch {
        // erro já tratado
        if (pendingFunds.current !== null) {
          scheduleFundsSave();
        }
      }
    }, 400);
  }

  function handleMonthChange(value: string) {
    const parsed = parseMonth(value);
    if (!parsed) return;
    setActiveMonth(parsed);
  }

  function handleBudgetChange(id: string, value: number) {
    editBudget(id, value);
    pendingBudgetUpdates.current.set(id, value);
    scheduleBudgetSave();
  }

  function handleUpdateFunds(value: number) {
    setSummaryFunds(value);
    pendingFunds.current = value;
    scheduleFundsSave();
  }

  function handleApplyQuickBudget(mode: QuickBudgetMode) {
    const result = applyQuickBudget(mode);
    if (result.diffs.length === 0) {
      setToast({ type: "info", message: "Nenhuma categoria foi alterada." });
      return;
    }
    for (const diff of result.diffs) {
      pendingBudgetUpdates.current.set(diff.id, diff.to);
    }
    scheduleBudgetSave();
    const summaryText = summarizeDiffs(result);
    setToast({ type: "success", message: summaryText.message });
  }

  const totals = useMemo(() => {
    return categories.reduce(
      (acc, item) => {
        acc.budgeted += item.budgeted_cents;
        acc.activity += item.activity_cents;
        acc.available += item.available_cents;
        return acc;
      },
      { budgeted: 0, activity: 0, available: 0 }
    );
  }, [categories]);

  const inflows = summary?.funds_for_month_cents ?? 0;
  const monthKey = formatMonthKey(activeMonth.year, activeMonth.month);
  const summaryChips = summary
    ? [
        { label: `Fundos de ${formatMonthLabel(summary.year, summary.month)}`, value: summary.funds_for_month_cents },
        { label: "Estouro mês anterior", value: summary.overspent_last_month_cents },
        { label: `Orçado em ${formatMonthLabel(summary.year, summary.month)}`, value: totals.budgeted },
        { label: "Orçado em futuro", value: summary.budgeted_in_future_cents }
      ]
    : [];

  const toBeBudgeted = summary?.to_be_budgeted_cents ?? 0;

  const pageTotals = {
    budgeted: totals.budgeted,
    activity: totals.activity,
    available: totals.available,
    inflows
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 pb-12">
      <TopBarBudget
        month={monthKey}
        months={monthOptions}
        toBeBudgeted={toBeBudgeted}
        summaryChips={summaryChips}
        onMonthChange={handleMonthChange}
      />

      {loading && (
        <div className="rounded-xl border border-dashed border-[var(--cc-border)] bg-[var(--cc-bg-elev)] p-6 text-sm text-[var(--cc-text-muted)]">
          Carregando orçamento…
        </div>
      )}

      {!loading && summary && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            <BudgetGrid
              categories={categories as BudgetAllocationView[]}
              selection={selection}
              focusedId={focusedId}
              onToggleSelection={(id, multi) => toggleSelection(id, multi)}
              onReplaceSelection={replaceSelection}
              onFocus={setFocused}
              onBudgetChange={handleBudgetChange}
            />
          </section>
          <SummaryPanel
            summary={summary}
            totals={pageTotals}
            selectionCount={selection.length}
            onApplyQuickBudget={handleApplyQuickBudget}
            previewQuickBudget={previewQuickBudget}
            onUpdateFunds={handleUpdateFunds}
            disabled={saving}
          />
        </div>
      )}

      <BudgetFooterStatus
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        lastAction={lastAction}
      />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-rose-500" : "bg-slate-500"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
