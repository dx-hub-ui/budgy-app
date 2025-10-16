"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  nowYM,
  getBudgetSummary,
  formatMonthLabel,
  budgetStatusFromTotals,
  centsToBRL
} from "@/domain/budget";

type SummaryState = {
  year: number;
  month: number;
  totals: { budgeted: number; activity: number; available: number } | null;
  hasBudget: boolean;
};

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + delta);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export default function BudgetsPage() {
  const [items, setItems] = useState<SummaryState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pivot, setPivot] = useState(() => nowYM());

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const months = [-1, 0, 1].map((delta) => shiftMonth(pivot.year, pivot.month, delta));
        const summaries = await Promise.all(
          months.map(({ year, month }) => getBudgetSummary(year, month))
        );
        setItems(
          months.map((monthInfo, index) => ({
            year: monthInfo.year,
            month: monthInfo.month,
            totals: summaries[index]?.totals ?? null,
            hasBudget: summaries[index] !== null
          }))
        );
      } catch (err: any) {
        setError(err.message ?? "Falha ao carregar orçamentos");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [pivot]);

  const pivotSlug = useMemo(() => {
    return `${pivot.year}-${String(pivot.month).padStart(2, "0")}`;
  }, [pivot]);

  const pivotLabel = useMemo(() => formatMonthLabel(pivot.year, pivot.month), [pivot]);

  function handleMove(delta: number) {
    setPivot((current) => shiftMonth(current.year, current.month, delta));
  }

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)] px-4 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <header className="flex flex-col gap-6 rounded-2xl bg-[var(--cc-surface-soft)] p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--cc-text-muted)]">
              Visão mensal
            </p>
            <div className="space-y-1">
              <p className="text-sm text-[var(--cc-text-muted)]">
                Acompanhe os meses planejados e mantenha seu dinheiro trabalhando para você.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center justify-between gap-3 rounded-full border border-[var(--cc-border-stronger)] bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => handleMove(-1)}
                className="rounded-full p-1 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-surface-soft)] hover:text-[var(--cc-text)]"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-[var(--cc-text)]">{pivotLabel}</span>
              <button
                type="button"
                onClick={() => handleMove(1)}
                className="rounded-full p-1 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-surface-soft)] hover:text-[var(--cc-text)]"
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Link
              href={`/budgets/${pivotSlug}`}
              className="inline-flex items-center justify-center rounded-full bg-[var(--cc-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--cc-primary-stronger)]"
            >
              Novo orçamento
            </Link>
          </div>
        </header>

        {error && (
          <p role="alert" className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-[var(--cc-border)] py-16 text-sm text-[var(--cc-text-muted)]">
            Carregando orçamentos…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {items.map(({ year, month, totals, hasBudget }) => {
              const slug = `${year}-${String(month).padStart(2, "0")}`;
              const status = totals && hasBudget ? budgetStatusFromTotals(totals) : null;
              const isPivot = year === pivot.year && month === pivot.month;
              const totalsWithFallback = totals ?? { budgeted: 0, activity: 0, available: 0 };
              return (
                <Link
                  key={slug}
                  href={`/budgets/${slug}`}
                  className={`group flex h-full flex-col gap-6 rounded-2xl border bg-[var(--cc-surface)] p-6 shadow-sm transition ${
                    isPivot
                      ? "border-[var(--cc-primary)] shadow-lg"
                      : "border-transparent hover:-translate-y-1 hover:border-[var(--cc-primary)] hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--cc-text-muted)]">
                        {formatMonthLabel(year, month)}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--cc-text)]">
                        {centsToBRL(totalsWithFallback.available)}
                      </p>
                      <p className="text-xs text-[var(--cc-text-muted)]">Disponível</p>
                    </div>
                    {status && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          status.tone === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : status.tone === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {status.label}
                      </span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-4 text-sm text-[var(--cc-text-muted)]">
                    <div className="rounded-xl bg-[var(--cc-surface-soft)] p-4">
                      <dt className="text-xs uppercase tracking-wide">Orçado</dt>
                      <dd className="mt-1 text-lg font-semibold text-[var(--cc-text)]">
                        {centsToBRL(totalsWithFallback.budgeted)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[var(--cc-surface-soft)] p-4">
                      <dt className="text-xs uppercase tracking-wide">Gasto</dt>
                      <dd className="mt-1 text-lg font-semibold text-[var(--cc-text)]">
                        {centsToBRL(totalsWithFallback.activity)}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-xs font-medium text-[var(--cc-primary)] opacity-0 transition group-hover:opacity-100">
                    {hasBudget ? "Ver detalhes do orçamento →" : "Começar orçamento agora →"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
