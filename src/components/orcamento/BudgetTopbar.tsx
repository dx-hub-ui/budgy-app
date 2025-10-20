"use client";

import { ChevronDown, ChevronLeft, ChevronRight, PlusCircle, Redo2, Undo2 } from "lucide-react";
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
  autoAssignDisabled
}: BudgetTopbarProps) {
  const monthLabel = formatMonthLabel(month);
  const readyToAssignDisabled = autoAssignDisabled ?? readyToAssignCents <= 0;

  return (
    <header className="rounded-3xl bg-[var(--budget-topbar-bg)] px-5 py-5 text-[var(--budget-topbar-text)] shadow-sm sm:px-6">
      <div className="flex flex-col gap-6">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_auto]">
          {/* Month switcher */}
          <div className="flex items-center justify-between gap-3 rounded-full bg-[var(--budget-topbar-chip-bg)] px-4 py-2 shadow-sm sm:w-fit">
            <button type="button" onClick={onGoPrevious} className="ghost-button ghost-button--icon" aria-label="Mês anterior">
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[8rem] text-center lg:min-w-[9rem]">
              <p className="text-[var(--budget-period-size)] font-medium uppercase tracking-[var(--budget-period-tracking)] text-[var(--budget-topbar-muted)]">
                Orçamento de
              </p>
              <p className="flex items-center justify-center gap-1 text-lg font-semibold text-[var(--budget-topbar-text)]">
                {monthLabel}
              </p>
            </div>
            <button type="button" onClick={onGoNext} className="ghost-button ghost-button--icon" aria-label="Próximo mês">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Compact green card */}
          <div className="flex justify-center justify-self-center">
            <div
              className="inline-flex w-full max-w-[var(--budget-ready-max-width)] items-center gap-3 rounded-lg border px-3 py-2 shadow-sm"
              style={{
                background: "var(--budget-ready-bg)",
                borderColor: "var(--budget-ready-border)",
                boxShadow: "var(--budget-ready-shadow)"
              }}
            >
              <div className="flex min-w-0 flex-col leading-tight">
                <span
                  className="uppercase"
                  style={{
                    fontSize: "var(--budget-label-size)",
                    letterSpacing: "var(--budget-label-tracking)",
                    color: "var(--budget-ready-text-muted)",
                    fontWeight: 600
                  }}
                >
                  Pronto para atribuir
                </span>
                <span
                  className="tabular truncate"
                  style={{
                    fontSize: "var(--budget-ready-amount-size)",
                    color: "var(--budget-ready-text)",
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}
                >
                  {fmtBRL(readyToAssignCents)}
                </span>
              </div>

              <button
                type="button"
                onClick={onOpenAutoAssign}
                disabled={readyToAssignDisabled}
                className="ml-auto inline-flex items-center justify-center gap-1 rounded-md px-3 py-1 font-semibold uppercase focus:outline-none disabled:opacity-60"
                style={{
                  background: "var(--budget-ready-cta-bg)",
                  color: "var(--cc-white)",
                  boxShadow: "var(--budget-ready-cta-shadow)",
                  fontSize: "var(--budget-cta-size)",
                  letterSpacing: "var(--budget-cta-tracking)"
                }}
                onMouseEnter={(e) => {
                  if (!readyToAssignDisabled) e.currentTarget.style.background = "var(--budget-ready-cta-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--budget-ready-cta-bg)";
                }}
              >
                Atribuir
                <ChevronDown size={12} aria-hidden />
              </button>
            </div>
          </div>

          <div className="hidden xl:block" aria-hidden />
        </div>

        {/* Actions row */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="row">
          <div role="cell" className="flex justify-center md:justify-start">
            <button type="button" onClick={onAddCategory} className="ghost-button">
              <PlusCircle size={16} aria-hidden />
              Adicionar categoria
            </button>
          </div>

          <div role="cell" className="flex justify-center md:justify-start">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onUndo} disabled={!canUndo} className="ghost-button" title="Desfazer (Ctrl+Z)">
                <Undo2 size={14} aria-hidden />
                Desfazer
              </button>
              <button type="button" onClick={onRedo} disabled={!canRedo} className="ghost-button" title="Refazer (Shift+Ctrl+Z)">
                <Redo2 size={14} aria-hidden />
                Refazer
              </button>
            </div>
          </div>

          <div role="cell" className="flex justify-center md:justify-start xl:justify-end" aria-hidden />
        </div>
      </div>
    </header>
  );
}
