"use client";

import { useEffect, useState } from "react";

import {
  BarChart3,
  BarChartHorizontal,
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
  progressBarsEnabled?: boolean;
  onProgressBarsToggle?: (enabled: boolean) => void;
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
  progressBarsEnabled,
  onProgressBarsToggle,
}: BudgetTopbarProps) {
  const monthLabel = formatMonthLabel(month);
  const readyToAssignDisabled = autoAssignDisabled ?? readyToAssignCents <= 0;
  const [progressEnabled, setProgressEnabled] = useState(progressBarsEnabled ?? true);

  useEffect(() => {
    if (typeof progressBarsEnabled === "boolean") {
      setProgressEnabled(progressBarsEnabled);
    }
  }, [progressBarsEnabled]);

  const handleProgressToggle = (enabled: boolean) => {
    setProgressEnabled(enabled);
    onProgressBarsToggle?.(enabled);
  };

  const ghostButtonBase =
    "inline-flex items-center gap-2 rounded-full border border-transparent bg-[#F5F5F7] px-4 py-2 text-sm font-semibold transition shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5865F2]";

  return (
    <header className="rounded-2xl bg-white px-6 py-6 text-[#1E1E1E] shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-between gap-3 rounded-full bg-[#F5F5F7] px-4 py-2 shadow-sm sm:w-fit">
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

          <div className="w-full max-w-xl rounded-xl bg-[#C6FF7F] px-5 py-4 text-left text-[#1C3A0D] shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-[22px] font-bold leading-tight text-[#1C3A0D]">{fmtBRL(readyToAssignCents)}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#1C3A0D]/70">
                  Pronto para atribuir
                </p>
                <p className="text-xs text-[#1C3A0D]/70">Saldo a distribuir neste mês</p>
              </div>
              <button
                type="button"
                onClick={onOpenAutoAssign}
                disabled={readyToAssignDisabled}
                className="inline-flex items-center gap-1 rounded-md bg-[#3E8E41] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#357835] disabled:cursor-not-allowed disabled:bg-[#A5D6A7] disabled:text-white"
              >
                Atribuir
                <ChevronDown size={14} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" role="row">
          <div role="cell" className="flex justify-center md:justify-start">
            <button
              type="button"
              onClick={onAddCategory}
              className={`${ghostButtonBase} hover:border-[#5865F2] hover:text-[#5865F2]`}
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
                className={`${ghostButtonBase} hover:border-[#5865F2] hover:text-[#5865F2] disabled:cursor-not-allowed disabled:opacity-50`}
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 size={14} aria-hidden />
                Desfazer
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={`${ghostButtonBase} hover:border-[#5865F2] hover:text-[#5865F2] disabled:cursor-not-allowed disabled:opacity-50`}
                title="Refazer (Shift+Ctrl+Z)"
              >
                <Redo2 size={14} aria-hidden />
                Refazer
              </button>
            </div>
          </div>

          <div role="cell" className="flex justify-center md:justify-start">
            <button
              type="button"
              onClick={onToggleHidden}
              className={`${ghostButtonBase} ${
                showHidden
                  ? "border-[#5865F2] text-[#5865F2]"
                  : "hover:border-[#5865F2] hover:text-[#5865F2]"
              }`}
            >
              <Eye size={16} aria-hidden />
              {showHidden ? "Ocultar categorias" : "Mostrar ocultas"}
            </button>
          </div>

          <div role="cell" className="flex justify-center md:justify-end">
            <div
              className="inline-flex items-center gap-1 rounded-full border border-[#E0E3ED] bg-[#F5F5F7] p-1 shadow-sm"
              role="tablist"
              aria-label="Barras de progresso"
            >
              <button
                type="button"
                role="tab"
                aria-selected={progressEnabled}
                className={`rounded-full p-2 transition ${
                  progressEnabled ? "bg-white text-[#5865F2] shadow" : "text-[#6E6E6E]"
                }`}
                onClick={() => handleProgressToggle(true)}
                title="Exibir barras de progresso"
              >
                <BarChart3 size={16} aria-hidden />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!progressEnabled}
                className={`rounded-full p-2 transition ${
                  !progressEnabled ? "bg-white text-[#5865F2] shadow" : "text-[#6E6E6E]"
                }`}
                onClick={() => handleProgressToggle(false)}
                title="Ocultar barras de progresso"
              >
                <BarChartHorizontal size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
