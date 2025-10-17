"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { fmtBRL, formatMonthLabel } from "@/domain/budgeting";

type BudgetTopbarProps = {
  month: string;
  readyToAssignCents: number;
  onGoPrevious: () => void;
  onGoNext: () => void;
  onOpenGroups: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function BudgetTopbar({
  month,
  readyToAssignCents,
  onGoPrevious,
  onGoNext,
  onOpenGroups,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: BudgetTopbarProps) {
  const monthLabel = formatMonthLabel(month);

  return (
    <header className="rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] px-6 py-6 text-[var(--cc-text)] shadow-[var(--shadow-1)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-3 rounded-full bg-[var(--cc-bg)] px-4 py-2 shadow-sm">
              <button
                type="button"
                onClick={onGoPrevious}
                className="rounded-full p-1.5 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-surface)] hover:text-[var(--cc-text)]"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-[8rem] text-center lg:min-w-[9rem]">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-muted)]">
                  Orçamento de
                </p>
                <p className="text-xl font-semibold text-[var(--cc-text)]">{monthLabel}</p>
              </div>
              <button
                type="button"
                onClick={onGoNext}
                className="rounded-full p-1.5 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-surface)] hover:text-[var(--cc-text)]"
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="min-w-[12rem] rounded-2xl bg-emerald-500 px-5 py-4 text-center text-emerald-50 shadow-sm">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em]">Pronto para atribuir</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{fmtBRL(readyToAssignCents)}</p>
              <p className="text-xs text-emerald-100">Saldo a distribuir neste mês</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="rounded-full border border-[var(--cc-border)] bg-[var(--cc-bg)] px-4 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:border-[var(--ring)] hover:text-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
              title="Desfazer (Ctrl+Z)"
            >
              Desfazer
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="rounded-full border border-[var(--cc-border)] bg-[var(--cc-bg)] px-4 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:border-[var(--ring)] hover:text-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
              title="Refazer (Shift+Ctrl+Z)"
            >
              Refazer
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onOpenGroups}
            className="rounded-full border border-[var(--cc-border)] bg-[var(--cc-bg)] px-4 py-2 text-sm font-medium text-[var(--cc-text)] shadow-sm transition hover:border-[var(--ring)] hover:text-[var(--ring)]"
          >
            Grupos de categorias
          </button>
        </div>
      </div>
    </header>
  );
}
