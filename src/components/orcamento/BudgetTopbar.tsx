"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { fmtBRL, formatMonthLabel } from "@/domain/budgeting";

type BudgetTopbarProps = {
  month: string;
  readyToAssignCents: number;
  onGoPrevious: () => void;
  onGoNext: () => void;
  onOpenGroups: () => void;
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
  onOpenGroups,
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
    <header className="rounded-2xl bg-white px-6 py-4 text-[#1E1E1E] shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[auto,1fr,auto] lg:items-center lg:gap-8">
          <div className="flex items-center gap-3 rounded-full bg-[#F5F5F7] px-4 py-2 shadow-sm">
            <button
              type="button"
              onClick={onGoPrevious}
              className="rounded-full p-1.5 text-[#6E6E6E] transition hover:bg-[#E6E8FF] hover:text-[#5865F2]"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[8rem] text-center lg:min-w-[9rem]">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#6E6E6E]">Orçamento de</p>
              <p className="flex items-center justify-center gap-1 text-lg font-bold text-[#1E1E1E]">
                {monthLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onGoNext}
              className="rounded-full p-1.5 text-[#6E6E6E] transition hover:bg-[#E6E8FF] hover:text-[#5865F2]"
              aria-label="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 text-center lg:flex-row lg:gap-4">
            <div
              className="min-w-[12rem] rounded-xl px-6 py-4 shadow-sm"
              style={{ backgroundColor: "#D6F5C6", color: "#1F6B2D" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1F6B2D]/80">
                Pronto para atribuir
              </p>
              <p className="mt-2 text-[22px] font-bold tracking-tight">{fmtBRL(readyToAssignCents)}</p>
              <p className="text-xs text-[#1F6B2D]/80">Saldo a distribuir neste mês</p>
            </div>
            <button
              type="button"
              onClick={onOpenAutoAssign}
              disabled={readyToAssignDisabled}
              className="rounded-md bg-[#4CAF50] px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#3E8E41] disabled:cursor-not-allowed disabled:bg-[#A5D6A7] disabled:text-white"
            >
              Atribuir
            </button>
          </div>

          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="rounded-full border border-transparent bg-[#F5F5F7] px-4 py-2 text-sm font-semibold text-[#1E1E1E] shadow-sm transition hover:border-[#5865F2] hover:text-[#5865F2] disabled:cursor-not-allowed disabled:opacity-50"
                title="Desfazer (Ctrl+Z)"
              >
                Desfazer
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="rounded-full border border-transparent bg-[#F5F5F7] px-4 py-2 text-sm font-semibold text-[#1E1E1E] shadow-sm transition hover:border-[#5865F2] hover:text-[#5865F2] disabled:cursor-not-allowed disabled:opacity-50"
                title="Refazer (Shift+Ctrl+Z)"
              >
                Refazer
              </button>
            </div>
            <div className="flex justify-center lg:justify-end">
              <button
                type="button"
                onClick={onOpenGroups}
                className="rounded-full border border-transparent bg-[#F5F5F7] px-4 py-2 text-sm font-medium text-[#1E1E1E] shadow-sm transition hover:border-[#5865F2] hover:text-[#5865F2]"
              >
                Grupos de categorias
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
