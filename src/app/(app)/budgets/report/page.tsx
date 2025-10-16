"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { getBudgetSummary, nowYM } from "@/domain/budget";
import { fmtBRL } from "@/domain/format";

const BudgetReportChart = dynamic(() => import("@/components/budget/BudgetReportChart"), {
  ssr: false
});

type ChartState = {
  labels: string[];
  planned: number[];
  actual: number[];
  totalPlanned: number;
  totalActual: number;
};

export default function BudgetReportPage() {
  const [chart, setChart] = useState<ChartState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const { year, month } = nowYM();
        const summary = await getBudgetSummary(year, month);
        if (!summary) {
          setChart(null);
          setError("Nenhum orçamento encontrado para este mês.");
          return;
        }
        const categories = [...summary.budget.budget_categories];
        categories.sort((a, b) => b.budgeted_cents - a.budgeted_cents);
        const top = categories.slice(0, 5);
        setChart({
          labels: top.map((item) => item.category?.name ?? "Sem categoria"),
          planned: top.map((item) => item.budgeted_cents),
          actual: top.map((item) => item.activity_cents),
          totalPlanned: summary.totals.budgeted,
          totalActual: summary.totals.activity
        });
      } catch (err: any) {
        setError(err.message ?? "Falha ao carregar relatório");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const difference = useMemo(() => {
    if (!chart) return 0;
    return chart.totalPlanned - chart.totalActual;
  }, [chart]);

  const diffBadgeTone = difference === 0 ? "info" : difference > 0 ? "success" : "danger";

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="grid gap-6 md:grid-cols-12">
        <header className="md:col-span-12">
          <div className="cc-stack-24">
            <p className="cc-section-sub text-sm">
              Visualize a comparação entre o planejado e o realizado no mês atual.
            </p>
          </div>
        </header>

        {error && (
          <p role="alert" className="md:col-span-12 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <p className="md:col-span-12 text-sm text-[var(--cc-text-muted)]">Carregando…</p>
        ) : chart ? (
          <section className="cc-card cc-stack-24 md:col-span-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-[var(--cc-text-muted)]">
                <p>Total previsto: {fmtBRL(chart.totalPlanned)}</p>
                <p>Total realizado: {fmtBRL(chart.totalActual)}</p>
              </div>
              <Badge tone={diffBadgeTone}>
                {difference === 0
                  ? "Em linha com o orçamento"
                  : difference > 0
                  ? `${fmtBRL(difference)} ainda disponíveis`
                  : `Excedido em ${fmtBRL(Math.abs(difference))}`}
              </Badge>
            </div>
            <div className="h-80 w-full">
              <BudgetReportChart labels={chart.labels} planned={chart.planned} actual={chart.actual} />
            </div>
          </section>
        ) : (
          <p className="md:col-span-12 text-sm text-[var(--cc-text-muted)]">
            Nenhum dado disponível para o mês atual.
          </p>
        )}
      </div>
    </div>
  );
}
