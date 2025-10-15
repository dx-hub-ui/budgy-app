"use client";

import { QuickBudgetMode, QuickBudgetResult } from "@/stores/budgetMonthStore";

const quickBudgetConfig: Array<{ mode: QuickBudgetMode; label: string }> = [
  { mode: "UNDERFUNDED", label: "Preencher metas" },
  { mode: "BUDGETED_LAST_MONTH", label: "Orçado mês anterior" },
  { mode: "SPENT_LAST_MONTH", label: "Gasto mês anterior" },
  { mode: "AVERAGE_BUDGETED", label: "Média orçada" },
  { mode: "AVERAGE_SPENT", label: "Média gasta" }
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type QuickBudgetPanelProps = {
  selectionCount: number;
  getPreview: (mode: QuickBudgetMode) => QuickBudgetResult;
  onApply: (mode: QuickBudgetMode) => void;
  disabled?: boolean;
};

export function QuickBudgetPanel({ selectionCount, getPreview, onApply, disabled }: QuickBudgetPanelProps) {
  return (
    <div className="rounded-xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-4 shadow-[var(--cc-shadow-1)]">
      <h3 className="text-sm font-semibold text-[var(--cc-text)]">Orçamento Rápido</h3>
      <p className="mt-1 text-xs text-[var(--cc-text-muted)]">
        {selectionCount > 0
          ? `${selectionCount} categoria${selectionCount > 1 ? "s" : ""} selecionada${selectionCount > 1 ? "s" : ""}`
          : "Aplica em todas as categorias"}
      </p>
      <div className="mt-4 space-y-2">
        {quickBudgetConfig.map((item) => {
          const result = getPreview(item.mode);
          const total = result.diffs.reduce((acc, diff) => acc + diff.delta, 0);
          return (
            <button
              key={item.mode}
              type="button"
              disabled={disabled || result.diffs.length === 0}
              onClick={() => onApply(item.mode)}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-left text-sm font-medium text-[var(--cc-text)] transition hover:border-[var(--cc-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{item.label}</span>
              <span className="text-[var(--cc-text-muted)]">{total === 0 ? "-" : currency.format(total / 100)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
