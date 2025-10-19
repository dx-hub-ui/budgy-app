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
    <header className="rounded-2xl bg-white px-6 py-6 text-[#1E1E1E] shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
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

          <div className="w-full max-w-xl rounded-xl bg-[#C6FF7F] px-5 py-4 text-left text-[#1C3A0D] shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-[22px] font-semibold leading-tight text-[#1C3A0D]">{fmtBRL(readyToAssignCents)}</p>
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-[#1C3A0D]/70">
                  Pronto para atribuir
                </p>
                <p className="text-xs font-normal text-[#1C3A0D]/70">Saldo a distribuir neste mês</p>
              </div>
              <button
                type="button"
                onClick={onOpenAutoAssign}
                disabled={readyToAssignDisabled}
                className={`ghost-button primary ${readyToAssignDisabled ? "" : "shadow-sm"}`}
              >
                Atribuir
                <ChevronDown size={14} aria-hidden />
              </button>
            </div>
          </div>
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
