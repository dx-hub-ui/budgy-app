"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  nowYM,
  getBudgetSummary,
  formatMonthLabel,
  budgetStatusFromTotals,
  centsToBRL,
  listRecentBudgets
} from "@/domain/budget";

type SummaryState = {
  year: number;
  month: number;
  totals: { budgeted: number; activity: number; available: number } | null;
};

export default function BudgetsPage() {
  const [items, setItems] = useState<SummaryState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const budgets = await listRecentBudgets(12);
        const summaries = await Promise.all(
          budgets.map(({ year, month }) => getBudgetSummary(year, month))
        );
        setItems(
          budgets
            .map((budget, index) => ({
              year: budget.year,
              month: budget.month,
              totals: summaries[index]?.totals ?? null
            }))
            .filter((item) => item.totals !== null)
        );
      } catch (err: any) {
        setError(err.message ?? "Falha ao carregar orçamentos");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const currentSlug = useMemo(() => {
    const { year, month } = nowYM();
    return `${year}-${String(month).padStart(2, "0")}`;
  }, []);

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)] px-4 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <header className="flex flex-col gap-6 rounded-2xl bg-[var(--cc-surface-soft)] p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--cc-text-muted)]">
              Visão mensal
            </p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-[var(--cc-text)]">Orçamentos</h1>
              <p className="text-sm text-[var(--cc-text-muted)]">
                Acompanhe os meses planejados e mantenha seu dinheiro trabalhando para você.
              </p>
            </div>
          </div>
          <Link
            href={`/budgets/${currentSlug}`}
            className="inline-flex items-center justify-center rounded-full bg-[var(--cc-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--cc-primary-stronger)]"
          >
            Novo orçamento
          </Link>
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--cc-border)] bg-[var(--cc-surface)] px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-[var(--cc-text)]">Você ainda não criou nenhum orçamento</h2>
            <p className="max-w-md text-sm text-[var(--cc-text-muted)]">
              Inicie planejando o mês atual e distribua seus recursos de acordo com suas prioridades, assim como no YNAB.
            </p>
            <Link
              href={`/budgets/${currentSlug}`}
              className="inline-flex items-center justify-center rounded-full bg-[var(--cc-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--cc-primary-stronger)]"
            >
              Criar primeiro orçamento
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(({ year, month, totals }) => {
              const slug = `${year}-${String(month).padStart(2, "0")}`;
              const status = totals ? budgetStatusFromTotals(totals) : null;
              return (
                <Link
                  key={slug}
                  href={`/budgets/${slug}`}
                  className="group flex flex-col gap-6 rounded-2xl border border-transparent bg-[var(--cc-surface)] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--cc-primary)] hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--cc-text-muted)]">
                        {formatMonthLabel(year, month)}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--cc-text)]">
                        {totals ? centsToBRL(totals.available) : "—"}
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
                        {totals ? centsToBRL(totals.budgeted) : "—"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[var(--cc-surface-soft)] p-4">
                      <dt className="text-xs uppercase tracking-wide">Gasto</dt>
                      <dd className="mt-1 text-lg font-semibold text-[var(--cc-text)]">
                        {totals ? centsToBRL(totals.activity) : "—"}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-xs font-medium text-[var(--cc-primary)] opacity-0 transition group-hover:opacity-100">
                    Ver detalhes do orçamento →
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
