"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { fmtBRL, formatMonthLabel } from "@/domain/budgeting";

type BudgetTopbarProps = {
  month: string;
  readyToAssignCents: number;
  assignedCents: number;
  activityCents: number;
  availableCents: number;
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
  assignedCents,
  activityCents,
  availableCents,
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
    <header className="border-b border-[var(--cc-border)] bg-[var(--cc-surface)] text-[var(--cc-text)] shadow-[var(--shadow-1)]">
      <div className="mx-auto w-full max-w-[var(--cc-content-maxw)] px-6 py-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
                <button
                  type="button"
                  onClick={onGoPrevious}
                  className="rounded-full p-1 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-surface-soft)] hover:text-[var(--cc-text)]"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-[7rem] text-center">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-muted)]">
                    Orçamento de
                  </p>
                  <p className="text-lg font-semibold text-[var(--cc-text)]">{monthLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={onGoNext}
                  className="rounded-full p-1 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-surface-soft)] hover:text-[var(--cc-text)]"
                  aria-label="Próximo mês"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <button
                type="button"
                onClick={onOpenGroups}
                className="rounded-full border border-[var(--cc-border)] bg-white/60 px-4 py-2 text-sm font-medium text-[var(--cc-text)] shadow-sm transition hover:border-[var(--cc-primary)] hover:text-[var(--cc-primary-stronger)]"
              >
                Grupos de categorias
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="rounded-full border border-[var(--cc-border)] bg-white/60 px-4 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:border-[var(--cc-primary)] hover:text-[var(--cc-primary-stronger)] disabled:cursor-not-allowed disabled:opacity-50"
                title="Desfazer (Ctrl+Z)"
              >
                Desfazer
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="rounded-full border border-[var(--cc-border)] bg-white/60 px-4 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:border-[var(--cc-primary)] hover:text-[var(--cc-primary-stronger)] disabled:cursor-not-allowed disabled:opacity-50"
                title="Refazer (Shift+Ctrl+Z)"
              >
                Refazer
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--cc-border)] bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-muted)]">
                Pronto para atribuir
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{fmtBRL(readyToAssignCents)}</p>
              <p className="text-xs text-[var(--cc-text-muted)]">Saldo a distribuir neste mês</p>
            </div>
            <div className="rounded-2xl border border-[var(--cc-border)] bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-muted)]">
                Atribuído
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{fmtBRL(assignedCents)}</p>
              <p className="text-xs text-[var(--cc-text-muted)]">Total destinado às categorias</p>
            </div>
            <div className="rounded-2xl border border-[var(--cc-border)] bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-muted)]">
                Atividade
              </p>
              <p className="mt-2 text-2xl font-semibold text-sky-600">{fmtBRL(activityCents)}</p>
              <p className="text-xs text-[var(--cc-text-muted)]">Movimentações do mês</p>
            </div>
            <div className="rounded-2xl border border-[var(--cc-border)] bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-muted)]">
                Disponível
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{fmtBRL(availableCents)}</p>
              <p className="text-xs text-[var(--cc-text-muted)]">Quanto resta após a atividade</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
