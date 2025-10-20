"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  PlusCircle,
  Redo2,
  Undo2,
} from "lucide-react";

import { fmtBRL, formatMonthLabel } from "@/domain/budgeting";

type BudgetTopbarProps = {
  month: string;
  readyToAssignCents: number;
  onGoPrevious: () => void;
  onGoNext: () => void;
  onAddCategory: () => void;
  onOpenAutoAssign: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showHidden: boolean;
  onToggleHidden: () => void;
  autoAssignDisabled?: boolean;
};

export function BudgetTopbar({
  month,
  readyToAssignCents,
  onGoPrevious,
  onGoNext,
  onAddCategory,
  onOpenAutoAssign,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showHidden,
  onToggleHidden,
  autoAssignDisabled,
}: BudgetTopbarProps) {
  const monthLabel = formatMonthLabel(month);
  const readyToAssignDisabled = autoAssignDisabled ?? readyToAssignCents <= 0;

  return (
    <header className="rounded-3xl bg-[var(--budget-topbar-bg)] px-5 py-5 text-[var(--budget-topbar-text)] shadow-sm sm:px-6">
      <div className="flex flex-col gap-6">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="flex items-center justify-between gap-3 rounded-full bg-[var(--budget-topbar-chip-bg)] px-4 py-2 shadow-sm sm:w-fit">
            <button
              type="button"
              onClick={onGoPrevious}
              className="ghost-button ghost-button--icon"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[8rem] text-center lg:min-w-[9rem]">
              <p className="text-[var(--budget-period-size)] font-medium uppercase tracking-[var(--budget-period-tracking)] text-[var(--budget-topbar-muted)]">Orçamento de</p>
              <p className="flex items-center justify-center gap-1 text-lg font-semibold text-[var(--budget-topbar-text)]">
                {monthLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onGoNext}
              className="ghost-button ghost-button--icon"
              aria-label="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex justify-center justify-self-center">
            <div className="inline-flex w-full max-w-[var(--budget-ready-max-width)] items-center gap-4 rounded-xl border border-[var(--budget-ready-border)] bg-[var(--budget-ready-bg)] px-5 py-2 text-left text-[var(--budget-ready-text)] shadow-[var(--budget-ready-shadow)]">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[var(--budget-label-size)] font-semibold uppercase tracking-[var(--budget-label-tracking)] text-[var(--budget-ready-text-muted)]">
                  Pronto para atribuir
                </p>
                <p className="truncate text-[var(--budget-ready-amount-size)] font-semibold leading-tight text-[var(--budget-ready-text)]">
                  {fmtBRL(readyToAssignCents)}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAutoAssign}
                disabled={readyToAssignDisabled}
                className="ml-auto inline-flex items-center justify-center gap-1 rounded-full bg-[var(--budget-ready-cta-bg)] px-3 py-1.5 text-[var(--budget-cta-size)] font-semibold uppercase tracking-[var(--budget-cta-tracking)] text-[var(--cc-white)] shadow-[var(--budget-ready-cta-shadow)] transition hover:bg-[var(--budget-ready-cta-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--budget-ready-cta-outline)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Atribuir
                <ChevronDown size={14} aria-hidden />
              </button>
            </div>
          </div>
          <div className="hidden xl:block" aria-hidden />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="row">
          <div role="cell" className="flex justify-center md:justify-start">
            <button
              type="button"
              onClick={onAddCategory}
              className="ghost-button"
            >
              <PlusCircle size={16} aria-hidden />
              Adicionar categoria
            </button>
          </div>

          <div role="cell" className="flex justify-center md:justify-start">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="ghost-button"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 size={14} aria-hidden />
                Desfazer
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="ghost-button"
                title="Refazer (Shift+Ctrl+Z)"
              >
                <Redo2 size={14} aria-hidden />
                Refazer
              </button>
            </div>
          </div>

          <div role="cell" className="flex justify-center md:justify-start xl:justify-end">
            <button
              type="button"
              onClick={onToggleHidden}
              className={`ghost-button ${showHidden ? "is-active" : ""}`}
            >
              <Eye size={16} aria-hidden />
              {showHidden ? "Ocultar categorias" : "Mostrar ocultas"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
