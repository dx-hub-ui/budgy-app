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
    <header className="rounded-3xl bg-white px-6 py-6 text-[#1E1E1E] shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="grid gap-5 xl:grid-cols-[auto_1fr_auto] xl:items-center">
          <div className="flex items-center justify-between gap-3 rounded-full bg-[#F5F5F7] px-4 py-2 shadow-sm sm:w-fit">
            <button
              type="button"
              onClick={onGoPrevious}
              className="ghost-button ghost-button--icon"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[8rem] text-center lg:min-w-[9rem]">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.28em] text-[#6E6E6E]">Orçamento de</p>
              <p className="flex items-center justify-center gap-1 text-lg font-semibold text-[#1E1E1E]">
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
          <div className="flex justify-center">
            <div className="inline-flex w-full max-w-[220px] flex-col items-center gap-3 rounded-2xl border border-[#AEE96F] bg-[#CBFF86] px-5 py-4 text-center text-[#1C3A0D] shadow-[0_14px_34px_rgba(33,102,16,0.22)]">
              <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.32em] text-[#1C3A0D]/80">
                Pronto para atribuir
              </p>
              <p className="text-2xl font-semibold leading-tight text-[#1C3A0D]">
                {fmtBRL(readyToAssignCents)}
              </p>
              <button
                type="button"
                onClick={onOpenAutoAssign}
                disabled={readyToAssignDisabled}
                className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#1C3A0D] px-3 py-2 text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-white shadow-[0_8px_14px_rgba(33,102,16,0.35)] transition hover:bg-[#16300A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C3A0D] disabled:cursor-not-allowed disabled:opacity-60"
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
