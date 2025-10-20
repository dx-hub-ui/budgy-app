// src/components/orcamento/BudgetTopbar.tsx
"use client";

import { ChevronLeft, ChevronRight, Plus, RotateCcw, RotateCw } from "lucide-react";
import { fmtBRL, formatMonthLabel } from "@/domain/budgeting";

type Props = {
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
}: Props) {
  const monthLabel = formatMonthLabel(month);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-[var(--cc-bg-elev)] px-4 py-3 shadow-[var(--cc-shadow-1)] lg:flex-row lg:items-center lg:justify-between">
      {/* Month controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onGoPrevious}
          className="ghost-button ghost-button--icon"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-[180px] text-center text-sm font-semibold text-[var(--cc-text)]">
          {monthLabel}
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

      {/* Ready to Assign green card */}
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
              {fmtBRL(readyToAssignCents)}
            </span>
        </div>

        <button
          type="button"
          onClick={onOpenAutoAssign}
          disabled={autoAssignDisabled}
          className="ml-auto inline-flex items-center gap-2 rounded-md px-3 py-1 font-semibold focus:outline-none disabled:opacity-60"
          style={{
            background: "var(--budget-ready-cta-bg)",
            color: "var(--cc-white)",
            boxShadow: "var(--budget-ready-cta-shadow)",
            fontSize: "var(--budget-cta-size)",
            letterSpacing: "var(--budget-cta-tracking)"
          }}
          onMouseEnter={(e) => {
            if (!autoAssignDisabled) e.currentTarget.style.background = "var(--budget-ready-cta-hover)";
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

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAddCategory}
          className="ghost-button primary"
          aria-label="Adicionar categoria"
        >
          <Plus size={16} />
          Adicionar categoria
        </button>

        <div className="ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="ghost-button ghost-button--icon"
            aria-label="Desfazer"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="ghost-button ghost-button--icon"
            aria-label="Refazer"
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
