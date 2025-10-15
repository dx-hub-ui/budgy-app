import { fmtBRL } from "@/domain/format";

import { MonthPicker } from "./MonthPicker";
import { PillValue } from "./PillValue";

type SummaryChip = {
  label: string;
  value: number;
};

type TopBarBudgetProps = {
  month: string;
  months: { value: string; label: string }[];
  toBeBudgeted: number;
  summaryChips: SummaryChip[];
  onMonthChange: (value: string) => void;
};

export function TopBarBudget({
  month,
  months,
  toBeBudgeted,
  summaryChips,
  onMonthChange
}: TopBarBudgetProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-[var(--cc-bg-elev)] px-4 py-3 shadow-[var(--cc-shadow-1)] lg:flex-row lg:items-center lg:justify-between">
      <MonthPicker value={month} options={months} onChange={onMonthChange} />
      <PillValue label="A orçar" value={toBeBudgeted} emphasize />
      <div className="flex flex-wrap items-center gap-3">
        {summaryChips.map((chip) => (
          <div
            key={chip.label}
            className="inline-flex flex-col rounded-xl border border-[var(--cc-border)] bg-[var(--cc-surface)] px-4 py-2 text-xs font-medium text-[var(--cc-text-muted)] shadow-[var(--cc-shadow-1)]"
          >
            <span>{chip.label}</span>
            <span className="text-base font-semibold text-[var(--cc-text)]">{fmtBRL(chip.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
