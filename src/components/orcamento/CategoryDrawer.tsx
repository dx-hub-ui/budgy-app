"use client";

import { useEffect, useMemo, useState } from "react";

import {
  calcularProjecaoMeta,
  fmtBRL,
  formatarInputMonetario,
  normalizarValorMonetario
} from "@/domain/budgeting";
import type { BudgetAllocation, BudgetCategory, BudgetGoal } from "@/stores/budgetPlannerStore";

const STEP_LABELS: Record<1 | 2 | 3, string> = {
  1: "Definir meta",
  2: "Planejamento e progresso",
  3: "Resumo"
};

type GoalFormState = {
  amountInput: string;
  cadence: "weekly" | "monthly" | "yearly" | "custom";
  type: "TB" | "TBD" | "MFG" | "CUSTOM";
  targetMonth: string | null;
  nextMonthStrategy: "increase" | "keep";
  deadlineMode: "end" | "day" | "month";
  deadlineValue: string;
};

type CategoryDrawerProps = {
  category: BudgetCategory;
  goal: BudgetGoal | undefined;
  allocation: BudgetAllocation | undefined;
  month: string;
  step: 1 | 2 | 3;
  onClose: () => void;
  onSaveGoal: (payload: { type: string; amount_cents: number; target_month?: string | null; cadence?: string | null }) => void;
  onApplyGoal: () => void;
  onRemoveGoal: () => void;
  onChangeStep: (step: 1 | 2 | 3) => void;
};

function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold " +
              (step <= current
                ? "bg-[var(--cc-accent)] text-white"
                : "border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] text-[var(--cc-text-muted)]")
            }
          >
            {step}
          </div>
          {step < 3 && <div className="h-px w-8 bg-[var(--cc-border)]" />}
        </div>
      ))}
    </div>
  );
}

export function CategoryDrawer({
  category,
  goal,
  allocation,
  month,
  step,
  onClose,
  onSaveGoal,
  onApplyGoal,
  onRemoveGoal,
  onChangeStep
}: CategoryDrawerProps) {
  const [form, setForm] = useState<GoalFormState>(() => ({
    amountInput: formatarInputMonetario(goal?.amount_cents ?? 0),
    cadence: goal?.cadence ?? "monthly",
    type: goal?.type ?? "MFG",
    targetMonth: goal?.target_month ? goal.target_month.slice(0, 7) : null,
    nextMonthStrategy: "increase",
    deadlineMode: "end",
    deadlineValue: ""
  }));

  useEffect(() => {
    setForm({
      amountInput: formatarInputMonetario(goal?.amount_cents ?? 0),
      cadence: goal?.cadence ?? "monthly",
      type: goal?.type ?? "MFG",
      targetMonth: goal?.target_month ? goal.target_month.slice(0, 7) : null,
      nextMonthStrategy: "increase",
      deadlineMode: "end",
      deadlineValue: ""
    });
  }, [goal?.amount_cents, goal?.cadence, goal?.target_month, goal?.type]);

  const projection = useMemo(() => {
    if (!goal || !allocation) return null;
    return calcularProjecaoMeta(goal, allocation, month);
  }, [goal, allocation, month]);

  const amountCents = normalizarValorMonetario(form.amountInput);

  const handleSubmit = () => {
    if (amountCents <= 0) {
      alert("Informe um valor válido");
      return;
    }
    onSaveGoal({
      type: form.type,
      amount_cents: amountCents,
      target_month: form.targetMonth ? `${form.targetMonth}-01` : null,
      cadence: form.cadence
    });
  };

  return (
    <aside className="fixed right-0 top-0 z-40 h-full w-[380px] border-l border-[var(--cc-border)] bg-[var(--cc-surface)] shadow-[var(--shadow-2)]">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[var(--cc-border)] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--cc-text)]">{category.name}</h3>
            <p className="text-sm text-[var(--cc-text-muted)]">Assistente de metas</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-transparent p-2 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-bg-elev)]"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4">
          <Stepper current={step} />
          <h4 className="mb-4 text-base font-semibold text-[var(--cc-text)]">{STEP_LABELS[step]}</h4>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-semibold text-[var(--cc-text)]">Frequência</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { cadence: "weekly", label: "Semanal", type: "CUSTOM" },
                    { cadence: "monthly", label: "Mensal", type: "MFG" },
                    { cadence: "yearly", label: "Anual", type: "TBD" },
                    { cadence: "custom", label: "Personalizado", type: "CUSTOM" }
                  ] as const).map((option) => (
                    <button
                      key={option.cadence}
                      type="button"
                      className={
                        "rounded-lg border px-3 py-2 text-sm font-semibold transition " +
                        (form.cadence === option.cadence
                          ? "border-[var(--cc-accent)] bg-[var(--brand-soft-bg)] text-[var(--cc-text)]"
                          : "border-[var(--cc-border)] bg-[var(--cc-bg-elev)] text-[var(--cc-text-muted)]")
                      }
                      onClick={() =>
                        setForm((state) => ({
                          ...state,
                          cadence: option.cadence,
                          type: option.type
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--cc-text)]">Preciso de</label>
                <input
                  value={form.amountInput}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      amountInput: formatarInputMonetario(normalizarValorMonetario(event.target.value))
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] focus:border-[var(--ring)] focus:outline-none"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--cc-text)]">Até</label>
                <select
                  className="w-full rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm text-[var(--cc-text)] focus:border-[var(--ring)] focus:outline-none"
                  value={form.deadlineMode}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      deadlineMode: event.target.value as GoalFormState["deadlineMode"]
                    }))
                  }
                >
                  <option value="end">Último dia do mês</option>
                  <option value="day">Dia específico</option>
                  <option value="month">Mês específico</option>
                </select>
                {form.deadlineMode === "day" && (
                  <input
                    className="mt-2 w-full rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm text-[var(--cc-text)] focus:border-[var(--ring)] focus:outline-none"
                    placeholder="Dia do mês (1-31)"
                    value={form.deadlineValue}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        deadlineValue: event.target.value
                      }))
                    }
                  />
                )}
                {form.deadlineMode === "month" && (
                  <input
                    className="mt-2 w-full rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm text-[var(--cc-text)] focus:border-[var(--ring)] focus:outline-none"
                    placeholder="AAAA-MM"
                    value={form.targetMonth ?? ""}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        targetMonth: event.target.value
                      }))
                    }
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--cc-text)]">No próximo mês quero</label>
                <select
                  className="w-full rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm text-[var(--cc-text)] focus:border-[var(--ring)] focus:outline-none"
                  value={form.nextMonthStrategy}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      nextMonthStrategy: event.target.value as GoalFormState["nextMonthStrategy"]
                    }))
                  }
                >
                  <option value="increase">Reservar mais {fmtBRL(amountCents)}</option>
                  <option value="keep">Manter saldo</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
                  onClick={() => onChangeStep(2)}
                >
                  Avançar
                </button>
                <button
                  type="button"
                  className="cc-btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
                  onClick={handleSubmit}
                >
                  Salvar meta
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {projection ? (
                <>
                  <p className="text-sm text-[var(--cc-text-muted)]">
                    Reserve {fmtBRL(projection.necessarioNoMes)} por mês até atingir {fmtBRL(projection.alvo)}.
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--brand-soft-fill)]">
                    <div
                      className="h-full rounded-full bg-[var(--cc-accent)] transition-all"
                      style={{ width: `${Math.min(100, Math.round((projection.progresso ?? 0) * 100))}%` }}
                    />
                  </div>
                  <div className="cc-banner-soft p-4">
                    <p className="mb-3 text-sm text-[var(--cc-text)]">
                      Atribua {fmtBRL(Math.max(projection.falta, projection.necessarioNoMes))} para alcançar a meta deste mês.
                    </p>
                    <button
                      type="button"
                      className="cc-btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
                      onClick={onApplyGoal}
                    >
                      Atribuir {fmtBRL(Math.max(projection.falta, projection.necessarioNoMes))}
                    </button>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-[var(--cc-text-muted)]">Atribuir este mês</dt>
                      <dd className="font-semibold text-[var(--cc-text)]">{fmtBRL(projection.necessarioNoMes)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--cc-text-muted)]">Atribuído até agora</dt>
                      <dd className="font-semibold text-[var(--cc-text)]">{fmtBRL(projection.atribuido)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--cc-text-muted)]">Falta</dt>
                      <dd className="font-semibold text-[var(--cc-text)]">{fmtBRL(projection.falta)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-sm text-[var(--cc-text-muted)]">Defina uma meta para visualizar o progresso.</p>
              )}
              <div className="flex justify-between">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
                  onClick={() => onChangeStep(1)}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
                  onClick={() => onChangeStep(3)}
                >
                  Avançar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="cc-card p-4">
                  <p className="text-sm text-[var(--cc-text-muted)]">Meta atual</p>
                  <p className="text-lg font-semibold text-[var(--cc-text)]">{fmtBRL(amountCents)}</p>
                </div>
                <div className="cc-card p-4">
                  <p className="text-sm text-[var(--cc-text-muted)]">Disponível</p>
                  <p className="text-lg font-semibold text-[var(--cc-text)]">{fmtBRL(allocation?.available_cents ?? 0)}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
                  onClick={() => onChangeStep(1)}
                >
                  Editar meta
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--state-danger)] px-3 py-2 text-sm font-semibold text-[var(--state-danger)] transition hover:bg-[var(--state-danger)] hover:text-white"
                    onClick={onRemoveGoal}
                  >
                    Remover
                  </button>
                  <button
                    type="button"
                    className="cc-btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
                    onClick={onApplyGoal}
                  >
                    Atribuir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
