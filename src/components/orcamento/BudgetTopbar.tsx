"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Plus, Redo2, Undo2 } from "lucide-react";

import GhostButton from "@/components/ui/GhostButton";
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
    <header className="rounded-2xl border border-[var(--tbl-border)] bg-white/90 px-4 py-4 text-[var(--budget-topbar-text)] shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-transparent bg-[var(--budget-topbar-chip-bg)] px-3 py-1.5">
            <button type="button" onClick={onGoPrevious} className="ghost-button ghost-button--icon" aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <div className="min-w-[7.5rem] text-center">
              <p className="text-[0.65rem] font-medium uppercase tracking-[var(--budget-period-tracking)] text-[var(--budget-topbar-muted)]">
                Orçamento de
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-[var(--budget-topbar-text)]">
                {monthLabel}
              </p>
            </div>
            <button type="button" onClick={onGoNext} className="ghost-button ghost-button--icon" aria-label="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex w-full max-w-md items-center gap-4 rounded-xl border border-[var(--budget-ready-border)] bg-[var(--budget-ready-bg)] px-4 py-2">
            <div className="flex min-w-0 flex-col leading-tight">
              <span
                className="tabular truncate text-base font-semibold text-[var(--budget-ready-text)]"
                style={{ lineHeight: 1.1 }}
              >
                {fmtBRL(readyToAssignCents)}
              </span>
              <span className="text-xs text-[var(--budget-ready-text-muted)]">Pronto para atribuir</span>
            </div>

            <button
              type="button"
              onClick={onOpenAutoAssign}
              disabled={readyToAssignDisabled}
              className="ml-auto inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[var(--budget-cta-tracking)] text-white transition disabled:opacity-60"
              style={{ background: "var(--budget-ready-cta-bg)" }}
              onMouseEnter={(event) => {
                if (!readyToAssignDisabled) {
                  event.currentTarget.style.background = "var(--budget-ready-cta-hover)";
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "var(--budget-ready-cta-bg)";
              }}
            >
              Atribuir
              <ChevronDown size={12} aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="row">
          <GhostButton icon={Plus} onClick={onAddCategory}>
            Adicionar categoria
          </GhostButton>

          <div className="flex flex-wrap items-center gap-2">
            <GhostButton icon={Undo2} onClick={onUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">
              Desfazer
            </GhostButton>
            <GhostButton icon={Redo2} onClick={onRedo} disabled={!canRedo} title="Refazer (Shift+Ctrl+Z)">
              Refazer
            </GhostButton>
          </div>
        </div>
      </div>
    </header>
  );
}
