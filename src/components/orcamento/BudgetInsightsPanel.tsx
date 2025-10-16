"use client";

import { fmtBRL, formatMonthLabel } from "@/domain/budgeting";

type BudgetInsightsPanelProps = {
  month: string;
  readyToAssignCents: number;
  assignedCents: number;
  activityCents: number;
  availableCents: number;
};

export function BudgetInsightsPanel({
  month,
  readyToAssignCents,
  assignedCents,
  activityCents,
  availableCents
}: BudgetInsightsPanelProps) {
  const monthLabel = formatMonthLabel(month);
  const availableClass =
    availableCents > 0
      ? "text-emerald-600"
      : availableCents < 0
      ? "text-rose-600"
      : "text-[var(--cc-text)]";

  return (
    <aside className="hidden w-full max-w-xs flex-none flex-col gap-5 rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 text-sm text-[var(--cc-text)] shadow-[var(--shadow-1)] xl:flex">
      <section className="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-bg)] p-5 shadow-sm">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--cc-text-muted)]">Plano do mês</p>
        <h2 className="mt-2 text-xl font-semibold leading-tight">{monthLabel}</h2>
        <p className="mt-3 text-xs text-[var(--cc-text-muted)]">
          Distribua o orçamento disponível para alcançar suas metas financeiras.
        </p>
      </section>

      <section>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--cc-text-muted)]">Resumo rápido</p>
        <dl className="mt-3 space-y-3 rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--cc-text-muted)]">Pronto para atribuir</dt>
            <dd className="text-base font-semibold text-[var(--cc-text)]">{fmtBRL(readyToAssignCents)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--cc-text-muted)]">Total atribuído</dt>
            <dd className="text-base font-semibold text-[var(--cc-text)]">{fmtBRL(assignedCents)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--cc-text-muted)]">Atividade do mês</dt>
            <dd className="text-base font-semibold text-sky-600">{fmtBRL(activityCents)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--cc-text-muted)]">Disponível</dt>
            <dd className={`text-base font-semibold ${availableClass}`}>{fmtBRL(availableCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-bg)] p-5 shadow-sm">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--cc-text-muted)]">Próximos passos</p>
        <ul className="mt-3 space-y-2 text-sm text-[var(--cc-text-muted)]">
          <li>→ Reveja categorias com saldo negativo e ajuste os aportes.</li>
          <li>→ Garanta um colchão para metas de longo prazo.</li>
          <li>→ Use o assistente para planejar despesas futuras.</li>
        </ul>
      </section>
    </aside>
  );
}
