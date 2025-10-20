// src/components/budget/TopBarBudget.tsx
import { fmtBRL } from "@/domain/format";
import { MonthPicker } from "./MonthPicker";

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
  onAssign?: () => void;
};

export function TopBarBudget({
  month,
  months,
  toBeBudgeted,
  summaryChips,
  onMonthChange,
  onAssign
}: TopBarBudgetProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-[var(--cc-bg-elev)] px-4 py-3 shadow-[var(--cc-shadow-1)] lg:flex-row lg:items-center lg:justify-between">
      <MonthPicker value={month} options={months} onChange={onMonthChange} />

      {/* Green "Ready to Assign" card */}
      <div
        className="inline-flex items-center gap-3 rounded-lg border px-3 py-2 shadow-sm"
        style={{
          background: "var(--budget-ready-bg)",
          borderColor: "var(--budget-ready-border)",
          boxShadow: "var(--budget-ready-shadow)",
          maxWidth: "var(--budget-ready-max-width)"
        }}
      >
        <div className="flex flex-col leading-tight">
          <span
            className="uppercase tracking-wide"
            style={{
              fontSize: "var(--budget-label-size)",
              letterSpacing: "var(--budget-label-tracking)",
              color: "var(--budget-ready-text-muted)"
            }}
          >
            Ready to Assign
          </span>
          <span
            className="tabular font-semibold"
            style={{
              fontSize: "var(--budget-ready-amount-size)",
              color: "var(--budget-ready-text)"
            }}
          >
            {fmtBRL(toBeBudgeted)}
          </span>
        </div>

        <button
          type="button"
          onClick={onAssign}
          className="ml-auto inline-flex items-center gap-2 rounded-md px-3 py-1 font-semibold focus:outline-none"
          style={{
            background: "var(--budget-ready-cta-bg)",
            color: "var(--cc-white)",
            boxShadow: "var(--budget-ready-cta-shadow)",
            fontSize: "var(--budget-cta-size)",
            letterSpacing: "var(--budget-cta-tracking)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--budget-ready-cta-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--budget-ready-cta-bg)";
          }}
        >
          Assign
          <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 7l5 6 5-6H5z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {summaryChips.map((chip) => (
          <div
            key={chip.label}
            className="inline-flex flex-col rounded-xl border border-[var(--cc-border)] bg-[var(--cc-surface)] px-4 py-2 text-xs font-medium text-[var(--cc-text-muted)] shadow-[var(--cc-shadow-1)]"
          >
            <span>{chip.label}</span>
            <span className="text-base font-semibold text-[var(--cc-text)]">
              {fmtBRL(chip.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
