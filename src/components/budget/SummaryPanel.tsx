import { BudgetMonthSummary } from "@/domain/budget";
import { fmtBRL } from "@/domain/format";
import { QuickBudgetMode, QuickBudgetResult } from "@/stores/budgetMonthStore";

import { FieldCurrency } from "../ui/FieldCurrency";

import { QuickBudgetPanel } from "./QuickBudgetPanel";

type SummaryPanelProps = {
  summary: BudgetMonthSummary;
  totals: { budgeted: number; activity: number; available: number; inflows: number };
  selectionCount: number;
  onApplyQuickBudget: (mode: QuickBudgetMode) => void;
  previewQuickBudget: (mode: QuickBudgetMode) => QuickBudgetResult;
  onUpdateFunds: (value: number) => void;
  disabled?: boolean;
};

export function SummaryPanel({
  summary,
  totals,
  selectionCount,
  onApplyQuickBudget,
  previewQuickBudget,
  onUpdateFunds,
  disabled
}: SummaryPanelProps) {
  const stats = [
    { label: "Total orçado", value: totals.budgeted },
    { label: "Total gasto", value: totals.activity },
    { label: "Total disponível", value: totals.available },
    { label: "Total de entradas", value: totals.inflows }
  ];

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-4 shadow-[var(--cc-shadow-1)]">
        <h2 className="text-sm font-semibold text-[var(--cc-text)]">Resumo</h2>
        <div className="mt-4">
          <label className="flex flex-col text-xs text-[var(--cc-text)]">
            <span className="mb-1 font-semibold">Saldo a orçar</span>
            <FieldCurrency
              value={summary.funds_for_month_cents}
              onChange={onUpdateFunds}
              aria-label="Saldo a orçar"
              className="bg-[var(--cc-surface)] text-right font-semibold text-[var(--cc-text)] focus:ring-2 focus:ring-[var(--cc-accent)]"
            />
          </label>
        </div>
        <dl className="mt-4 space-y-3">
          {stats.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <dt className="text-[var(--cc-text-muted)]">{item.label}</dt>
              <dd className="font-semibold text-[var(--cc-text)]">{fmtBRL(item.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <QuickBudgetPanel
        selectionCount={selectionCount}
        getPreview={previewQuickBudget}
        onApply={onApplyQuickBudget}
        disabled={disabled}
      />
    </aside>
  );
}
