"use client";

import { fmtBRL } from "@/domain/budgeting";

type MonthOption = { value: string; label: string };

type BudgetTopbarProps = {
  month: string;
  options: MonthOption[];
  readyToAssignCents: number;
  onChangeMonth: (value: string) => void;
  onOpenGroups: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function BudgetTopbar({
  month,
  options,
  readyToAssignCents,
  onChangeMonth,
  onOpenGroups,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: BudgetTopbarProps) {
  return (
    <header className="bg-[var(--cc-surface)] border-b border-[var(--cc-border)] text-[var(--cc-text)] shadow-[var(--shadow-1)]">
      <div className="mx-auto flex h-[var(--cc-topbar-h)] w-full max-w-[var(--cc-content-maxw)] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-[var(--cc-text-muted)]" htmlFor="budget-month-select">
            Mês
          </label>
          <select
            id="budget-month-select"
            className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm text-[var(--cc-text)] shadow-sm focus:border-[var(--ring)] focus:outline-none"
            value={month}
            onChange={(event) => onChangeMonth(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenGroups}
            className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm font-medium text-[var(--cc-text)] shadow-sm transition hover:bg-[var(--brand-soft-bg)]"
          >
            Grupos de categorias
          </button>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="cc-pill cc-pill-positive text-sm">
            Pronto para atribuir: {fmtBRL(readyToAssignCents)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:bg-[var(--brand-soft-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            title="Desfazer (Ctrl+Z)"
          >
            Desfazer
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:bg-[var(--brand-soft-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            title="Refazer (Shift+Ctrl+Z)"
          >
            Refazer
          </button>
        </div>
      </div>
      <div className="px-6 pb-3 md:hidden">
        <div className="cc-pill cc-pill-positive inline-flex text-sm">
          Pronto para atribuir: {fmtBRL(readyToAssignCents)}
        </div>
      </div>
    </header>
  );
}
