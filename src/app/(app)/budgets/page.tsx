"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  nowYM,
  getBudgetSummary,
  formatMonthLabel,
  budgetStatusFromTotals,
  centsToBRL
} from "@/domain/budget";

function previousMonth(year: number, month: number) {
  const m = month - 1;
  if (m >= 1) return { year, month: m };
  return { year: year - 1, month: 12 };
}

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
    const { year, month } = nowYM();
    const months: SummaryState[] = [];
    let cursor = { year, month };
    for (let i = 0; i < 6; i += 1) {
      months.push({ year: cursor.year, month: cursor.month, totals: null });
      cursor = previousMonth(cursor.year, cursor.month);
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const results = await Promise.all(
          months.map(({ year, month }) => getBudgetSummary(year, month))
        );
        setItems(
          months.map((item, index) => ({
            ...item,
            totals: results[index]?.totals ?? null
          }))
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
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="grid gap-6 md:grid-cols-12">
        <header className="md:col-span-12">
          <div className="cc-stack-24">
            <div>
              <h1 className="text-[28px] leading-[36px] font-semibold">Orçamentos</h1>
              <p className="cc-section-sub text-sm">
                Controle seus envelopes por mês e mantenha o saldo a orçar sempre em dia.
              </p>
            </div>
            <div>
              <Link
                href={`/budgets/${currentSlug}`}
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
                style={{ borderColor: "var(--cc-border)" }}
              >
                Novo orçamento
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <p role="alert" className="md:col-span-12 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <div className="md:col-span-12 text-sm text-[var(--cc-text-muted)]">
            Carregando…
          </div>
        ) : (
          items.map(({ year, month, totals }) => {
            const slug = `${year}-${String(month).padStart(2, "0")}`;
            const status = totals ? budgetStatusFromTotals(totals) : null;
            return (
              <Link
                key={slug}
                href={`/budgets/${slug}`}
                className="cc-card flex flex-col gap-3 rounded-xl border p-4 transition hover:border-[var(--cc-primary)]"
                style={{ borderColor: "var(--cc-border)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-[var(--cc-text)]">
                    {formatMonthLabel(year, month)}
                  </h2>
                  {status ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        status.tone === "success"
                          ? "bg-green-100 text-green-800"
                          : status.tone === "warning"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {status.label}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Sem orçamento
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm text-[var(--cc-text-muted)]">
                  <div>
                    <p className="uppercase tracking-wide">Orçado</p>
                    <p className="font-semibold text-[var(--cc-text)]">
                      {totals ? centsToBRL(totals.budgeted) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide">Gasto</p>
                    <p className="font-semibold text-[var(--cc-text)]">
                      {totals ? centsToBRL(totals.activity) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide">Disponível</p>
                    <p className="font-semibold text-[var(--cc-text)]">
                      {totals ? centsToBRL(totals.available) : "—"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
