"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  X
} from "lucide-react";

import {
  calcularProjecaoMeta,
  fmtBRL,
  normalizarValorMonetario
} from "@/domain/budgeting";
import type {
  BudgetAllocation,
  BudgetCategory,
  BudgetGoal
} from "@/stores/budgetPlannerStore";

const TARGET_TABS = [
  { label: "Weekly", value: "weekly" as const },
  { label: "Monthly", value: "monthly" as const },
  { label: "Yearly", value: "yearly" as const },
  { label: "Custom", value: "custom" as const }
];

const DUE_DAY_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: "Last Day of Month", value: null },
  { label: "1st of the Month", value: 1 },
  { label: "15th of the Month", value: 15 },
  { label: "24th of the Month", value: 24 }
];

type CategoryDetailsPayload = {
  summary: {
    available_balance_cents: number;
    cash_left_over_from_last_month_cents: number;
    assigned_this_month_cents: number;
    cash_spending_cents: number;
    credit_spending_cents: number;
  };
  auto_assign: {
    assigned_last_month_cents: number;
    spent_last_month_cents: number;
    average_assigned_cents: number;
    average_spent_cents: number;
  };
  note: string | null;
};

type CategoryDetailsPanelProps = {
  category: BudgetCategory;
  allocation: BudgetAllocation | undefined;
  previousAllocation: BudgetAllocation | undefined;
  goal: BudgetGoal | undefined;
  month: string;
  onClose: () => void;
  onAssign: (value: number) => void | Promise<void>;
  onArchive: () => void | Promise<void>;
  onRename: () => void | Promise<void>;
  onSaveGoal: (payload: {
    type: BudgetGoal["type"];
    amount_cents: number;
    cadence?: BudgetGoal["cadence"];
    target_month?: string | null;
    due_day_of_month?: number | null;
  }) => Promise<void> | void;
  onApplyGoal: () => Promise<void> | void;
  onRemoveGoal: () => Promise<void> | void;
};

type TargetTab = typeof TARGET_TABS[number]["value"];

type TargetFormState = {
  tab: TargetTab;
  amountInput: string;
  cadence: BudgetGoal["cadence"];
  type: BudgetGoal["type"];
  dueDay: number | null;
};

function ordinal(day: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
  const rem10 = day % 10;
  const suffix = suffixes[rem10] ?? suffixes[0];
  return `${day}${suffix}`;
}

function getInitialForm(goal: BudgetGoal | undefined): TargetFormState {
  if (!goal) {
    return {
      tab: "monthly",
      amountInput: "",
      cadence: "monthly",
      type: "MFG",
      dueDay: null
    };
  }
  const tab: TargetTab = goal.cadence === "weekly"
    ? "weekly"
    : goal.cadence === "yearly"
      ? "yearly"
      : goal.cadence === "custom"
        ? "custom"
        : "monthly";
  return {
    tab,
    amountInput: goal.amount_cents ? fmtBRL(goal.amount_cents) : "",
    cadence: goal.cadence ?? "monthly",
    type: goal.type,
    dueDay: goal.due_day_of_month ?? null
  };
}

function useCategoryDetails(categoryId: string, month: string) {
  const [data, setData] = useState<CategoryDetailsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    if (!categoryId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/budget/category/${categoryId}/details?month=${month}`, {
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load category details");
        }
        return response.json() as Promise<CategoryDetailsPayload>;
      })
      .then((payload) => {
        setData(payload);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err?.message ?? "Unable to load category details");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [categoryId, month]);

  const refresh = () => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/budget/category/${categoryId}/details?month=${month}`)
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load category details");
        }
        return response.json() as Promise<CategoryDetailsPayload>;
      })
      .then((payload) => {
        setData(payload);
      })
      .catch((err) => {
        setError(err?.message ?? "Unable to load category details");
      })
      .finally(() => setLoading(false));
  };

  return { data, loading, error, refresh } as const;
}

export function CategoryDetailsPanel({
  category,
  allocation,
  previousAllocation,
  goal,
  month,
  onClose,
  onAssign,
  onArchive,
  onRename,
  onSaveGoal,
  onApplyGoal,
  onRemoveGoal
}: CategoryDetailsPanelProps) {
  const [targetExpanded, setTargetExpanded] = useState(Boolean(goal));
  const [autoAssignExpanded, setAutoAssignExpanded] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [form, setForm] = useState(() => getInitialForm(goal));
  const [savingGoal, setSavingGoal] = useState(false);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const { data, loading, error, refresh } = useCategoryDetails(category.id, month);

  useEffect(() => {
    setForm(getInitialForm(goal));
    setIsEditingTarget(false);
    setTargetExpanded(Boolean(goal));
  }, [goal]);

  useEffect(() => {
    setNoteDraft("");
    setNoteError(null);
  }, [category.id, month]);

  useEffect(() => {
    if (data?.note) {
      setNoteDraft(data.note.slice(0, 500));
    } else {
      setNoteDraft("");
    }
  }, [data?.note]);

  const summary = data?.summary ?? {
    available_balance_cents: allocation?.available_cents ?? 0,
    cash_left_over_from_last_month_cents: previousAllocation?.available_cents ?? 0,
    assigned_this_month_cents: allocation?.assigned_cents ?? 0,
    cash_spending_cents: allocation?.activity_cents ?? 0,
    credit_spending_cents: 0
  };

  const autoAssign = data?.auto_assign ?? {
    assigned_last_month_cents: previousAllocation?.assigned_cents ?? 0,
    spent_last_month_cents: previousAllocation?.activity_cents ?? 0,
    average_assigned_cents: allocation?.assigned_cents ?? 0,
    average_spent_cents: allocation?.activity_cents ?? 0
  };

  const projection = useMemo(() => {
    if (!goal || !allocation) return null;
    return calcularProjecaoMeta(goal, allocation, month);
  }, [allocation, goal, month]);

  const progressPercent = projection ? Math.min(100, Math.max(0, Math.round((projection.progresso ?? 0) * 100))) : 0;
  const assignCalloutAmount = projection ? Math.max(projection.necessarioNoMes, projection.falta) : 0;

  const handleToggleTarget = () => {
    if (isEditingTarget) return;
    setTargetExpanded((prev) => !prev);
  };

  const handleStartEdit = () => {
    setForm(getInitialForm(goal));
    setIsEditingTarget(true);
    setTargetExpanded(true);
    setTargetError(null);
  };

  const handleCancelEdit = () => {
    setForm(getInitialForm(goal));
    setIsEditingTarget(false);
    if (!goal) {
      setTargetExpanded(false);
    }
    setTargetError(null);
  };

  const handleChangeTab = (tab: TargetTab) => {
    let cadence: BudgetGoal["cadence"] = "monthly";
    let type: BudgetGoal["type"] = "MFG";
    switch (tab) {
      case "weekly":
        cadence = "weekly";
        type = "MFG";
        break;
      case "monthly":
        cadence = "monthly";
        type = "MFG";
        break;
      case "yearly":
        cadence = "yearly";
        type = "MFG";
        break;
      case "custom":
        cadence = "custom";
        type = "CUSTOM";
        break;
      default:
        cadence = "monthly";
        type = "MFG";
    }
    setForm((prev) => ({
      ...prev,
      tab,
      cadence,
      type
    }));
    setTargetError(null);
  };

  const handleAdjustAmount = (delta: number) => {
    const cents = normalizarValorMonetario(form.amountInput || "0");
    const next = Math.max(0, cents + delta);
    setForm((prev) => ({
      ...prev,
      amountInput: fmtBRL(next)
    }));
    setTargetError(null);
  };

  const handleSaveGoal = async () => {
    const cents = normalizarValorMonetario(form.amountInput || "0");
    if (cents <= 0) {
      setTargetError("Enter a value greater than zero for the target.");
      return;
    }
    setSavingGoal(true);
    try {
      setTargetError(null);
      await Promise.resolve(
        onSaveGoal({
          type: form.type,
          amount_cents: cents,
          cadence: form.cadence,
          due_day_of_month: form.dueDay ?? null
        })
      );
      setIsEditingTarget(false);
      refresh();
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDeleteGoal = async () => {
    setSavingGoal(true);
    try {
      await Promise.resolve(onRemoveGoal());
      setIsEditingTarget(false);
      setTargetExpanded(false);
      refresh();
    } finally {
      setSavingGoal(false);
    }
  };

  const handleAssignAction = async (label: string, amount: number, action: (value: number) => void | Promise<void>) => {
    setActionPending(label);
    try {
      await Promise.resolve(action(amount));
      refresh();
    } finally {
      setActionPending(null);
    }
  };

  const handleResetAvailable = () => {
    const prev = summary.cash_left_over_from_last_month_cents ?? 0;
    const spend = summary.cash_spending_cents ?? 0;
    const targetAssigned = Math.max(spend - prev, 0);
    return handleAssignAction("reset_available", targetAssigned, onAssign);
  };

  const handleResetAssigned = () => handleAssignAction("reset_assigned", 0, onAssign);

  const handleNoteBlur = async () => {
    if (!data) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      const trimmed = noteDraft.trim().slice(0, 500);
      const response = await fetch(`/api/budget/category/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ note: trimmed.length > 0 ? trimmed : null })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save note");
      }
      setNoteDraft(trimmed);
      setNoteError(null);
      refresh();
    } catch (err: any) {
      setNoteError(err?.message ?? "Unable to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const dueDayLabel = goal?.due_day_of_month
    ? `${ordinal(goal.due_day_of_month)} of the Month`
    : "Last Day of the Month";

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-xl">{category.icon ?? "🏷️"}</span>
          <div>
            <p className="text-base font-semibold text-[var(--cc-text)]">{category.name}</p>
            <p className="text-xs text-[var(--cc-text-muted)]">{category.group_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--cc-border)] p-2 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-bg-elev)]"
            onClick={() => void onRename()}
            aria-label="Edit category"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--cc-border)] px-3 py-1 text-xs font-semibold text-[var(--state-danger)] transition hover:bg-[var(--cc-bg-elev)]"
            onClick={() => void onArchive()}
          >
            Archive
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--cc-border)] p-2 text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-bg-elev)]"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-[var(--shadow-1)]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--cc-text)]">Available Balance</h3>
            <p className="text-xs text-[var(--cc-text-muted)]">Updated with the latest assignments</p>
          </div>
          <p
            className={`text-2xl font-semibold ${
              summary.available_balance_cents < 0 ? "text-[var(--state-danger)]" : "text-[var(--cc-text)]"
            }`}
          >
            {fmtBRL(summary.available_balance_cents)}
          </p>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--cc-text-muted)]">Loading category details…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-[var(--state-danger)]">{error}</p>
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[var(--cc-text-muted)]">Cash Left Over From Last Month</dt>
              <dd className="font-semibold text-[var(--cc-text)]">
                {fmtBRL(summary.cash_left_over_from_last_month_cents)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--cc-text-muted)]">Assigned This Month</dt>
              <dd className="font-semibold text-[var(--cc-text)]">
                {fmtBRL(summary.assigned_this_month_cents)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--cc-text-muted)]">Cash Spending</dt>
              <dd className="font-semibold text-[var(--cc-text)]">{fmtBRL(summary.cash_spending_cents)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--cc-text-muted)]">Credit Spending</dt>
              <dd className="font-semibold text-[var(--cc-text)]">{fmtBRL(summary.credit_spending_cents)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-[var(--shadow-1)]">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={handleToggleTarget}
          aria-expanded={targetExpanded}
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--cc-text)]">Target</h3>
            {!goal && !isEditingTarget ? (
              <p className="text-xs text-[var(--cc-text-muted)]">
                How much do you need for {category.name}?
              </p>
            ) : null}
          </div>
          {targetExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {targetExpanded ? (
          <div className="mt-4 space-y-4">
            {isEditingTarget ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {TARGET_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={`rounded-full px-4 py-1 text-sm font-semibold transition ${
                        form.tab === tab.value
                          ? "bg-[var(--cc-text)] text-[var(--cc-surface)]"
                          : "border border-[var(--cc-border)] text-[var(--cc-text)] hover:bg-[var(--cc-bg-elev)]"
                      }`}
                      onClick={() => handleChangeTab(tab.value)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--cc-text)]">
                  <span>I need</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[var(--cc-border)] p-2 text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
                      onClick={() => handleAdjustAmount(-100)}
                      aria-label="Decrease amount"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      className="w-full rounded-xl border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-2 text-sm font-semibold shadow-sm focus:border-[var(--ring)] focus:outline-none"
                      value={form.amountInput}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          amountInput: event.target.value
                        }))
                      }
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      onFocus={() => setTargetError(null)}
                    />
                    <button
                      type="button"
                      className="rounded-full border border-[var(--cc-border)] p-2 text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
                      onClick={() => handleAdjustAmount(100)}
                      aria-label="Increase amount"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--cc-text)]">
                  <span>By</span>
                  <select
                    className="rounded-xl border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-2 text-sm font-semibold shadow-sm focus:border-[var(--ring)] focus:outline-none"
                    value={form.dueDay ?? "last"}
                    onChange={(event) => {
                      const rawValue = event.target.value === "last" ? null : Number(event.target.value);
                      setTargetError(null);
                      setForm((prev) => ({
                        ...prev,
                        dueDay:
                          typeof rawValue === "number" && Number.isFinite(rawValue)
                            ? rawValue
                            : null
                      }));
                    }}
                  >
                    {DUE_DAY_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value ?? "last"}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--cc-text)]">
                  <span>Next month I want to</span>
                  <select className="rounded-xl border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-2 text-sm font-semibold text-[var(--cc-text-muted)] shadow-sm" disabled>
                    <option>Set aside another {fmtBRL(normalizarValorMonetario(form.amountInput || "0"))}</option>
                  </select>
                </label>

                {targetError ? (
                  <p className="text-sm text-[var(--state-danger)]">{targetError}</p>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--cc-border)] pt-4">
                  {goal ? (
                    <button
                      type="button"
                      className="mr-auto text-sm font-semibold text-[var(--state-danger)] hover:underline"
                      onClick={handleDeleteGoal}
                      disabled={savingGoal}
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full border border-[var(--cc-border)] px-4 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
                    onClick={handleCancelEdit}
                    disabled={savingGoal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:brightness-105 disabled:opacity-60"
                    onClick={handleSaveGoal}
                    disabled={savingGoal}
                  >
                    Save Target
                  </button>
                </div>
              </div>
            ) : goal ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--cc-text)]">
                    Set Aside Another {fmtBRL(goal.amount_cents)} Each {goal.cadence === "weekly" ? "Week" : goal.cadence === "yearly" ? "Year" : "Month"}
                  </p>
                  <p className="text-xs text-[var(--cc-text-muted)]">By the {dueDayLabel}</p>
                </div>

                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-28 w-28">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#facc15 ${progressPercent * 3.6}deg, #fef08a 0deg)`
                      }}
                      aria-hidden
                    />
                    <div className="absolute inset-3 rounded-full bg-[var(--cc-surface)]" />
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-[var(--cc-text)]">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="space-y-1 text-center text-sm text-[var(--cc-text)] sm:text-left">
                    <p className="font-semibold">
                      {assignCalloutAmount > 0
                        ? `Assign ${fmtBRL(assignCalloutAmount)} to meet your target.`
                        : "You're on track for this target."}
                    </p>
                    <p className="text-[var(--cc-text-muted)]">
                      Keep assigning regularly to stay ahead of schedule.
                    </p>
                  </div>
                </div>

                {assignCalloutAmount > 0 ? (
                  <button
                    type="button"
                    className="w-full rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:brightness-105 disabled:opacity-60 sm:w-auto"
                    onClick={async () => {
                      setActionPending("apply_goal");
                      try {
                        await Promise.resolve(onApplyGoal());
                        refresh();
                      } finally {
                        setActionPending(null);
                      }
                    }}
                    disabled={actionPending === "apply_goal"}
                  >
                    Assign {fmtBRL(assignCalloutAmount)}
                  </button>
                ) : null}

                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[var(--cc-bg-elev)] px-4 py-3 text-sm">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">Amount to Assign This Month</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--cc-text)]">
                      {fmtBRL(projection?.necessarioNoMes ?? 0)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--cc-bg-elev)] px-4 py-3 text-sm">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">Assigned So Far</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--cc-text)]">
                      {fmtBRL(allocation?.assigned_cents ?? 0)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--cc-bg-elev)] px-4 py-3 text-sm">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">To Go</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--cc-text)]">
                      {fmtBRL(Math.max(projection?.falta ?? 0, 0))}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--cc-text)] underline-offset-4 hover:underline"
                  onClick={handleStartEdit}
                >
                  Edit Target
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[var(--cc-text-muted)]">
                  When you create a target, we’ll let you know how much money to set aside to stay on track over time.
                </p>
                <button
                  type="button"
                  className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:brightness-105"
                  onClick={handleStartEdit}
                >
                  Create Target
                </button>
              </div>
            )}
          </div>
        ) : !goal ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--cc-text-muted)]">
              When you create a target, we’ll let you know how much money to set aside to stay on track over time.
            </p>
            <button
              type="button"
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-[var(--cc-text)] shadow-sm transition hover:brightness-105"
              onClick={handleStartEdit}
            >
              Create Target
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-[var(--shadow-1)]">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setAutoAssignExpanded((prev) => !prev)}
          aria-expanded={autoAssignExpanded}
        >
          <h3 className="text-sm font-semibold text-[var(--cc-text)]">Auto-Assign</h3>
          {autoAssignExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {autoAssignExpanded ? (
          <div className="mt-4 space-y-2 text-sm">
            <AutoAssignRow
              label="Assigned Last Month"
              value={autoAssign.assigned_last_month_cents}
              onClick={() => handleAssignAction("assigned_last_month", autoAssign.assigned_last_month_cents, onAssign)}
              pending={actionPending === "assigned_last_month"}
            />
            <AutoAssignRow
              label="Spent Last Month"
              value={autoAssign.spent_last_month_cents}
              onClick={() => handleAssignAction("spent_last_month", autoAssign.spent_last_month_cents, onAssign)}
              pending={actionPending === "spent_last_month"}
            />
            <AutoAssignRow
              label="Average Assigned"
              value={autoAssign.average_assigned_cents}
              onClick={() => handleAssignAction("average_assigned", autoAssign.average_assigned_cents, onAssign)}
              pending={actionPending === "average_assigned"}
            />
            <AutoAssignRow
              label="Average Spent"
              value={autoAssign.average_spent_cents}
              onClick={() => handleAssignAction("average_spent", autoAssign.average_spent_cents, onAssign)}
              pending={actionPending === "average_spent"}
            />
            <AutoAssignRow
              label="Reset Available Amount"
              value={summary.available_balance_cents}
              onClick={handleResetAvailable}
              pending={actionPending === "reset_available"}
            />
            <AutoAssignRow
              label="Reset Assigned Amount"
              value={allocation?.assigned_cents ?? 0}
              onClick={handleResetAssigned}
              pending={actionPending === "reset_assigned"}
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-[var(--shadow-1)]">
        <h3 className="text-sm font-semibold text-[var(--cc-text)]">Notes</h3>
        <textarea
          className="mt-3 min-h-[120px] w-full resize-y rounded-xl border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-3 text-sm text-[var(--cc-text)] shadow-sm focus:border-[var(--ring)] focus:outline-none"
          placeholder="Enter a note…"
          value={noteDraft}
          onChange={(event) => {
            setNoteError(null);
            setNoteDraft(event.target.value.slice(0, 500));
          }}
          onBlur={() => {
            void handleNoteBlur();
          }}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--cc-text-muted)]">
          {savingNote ? <span>Saving…</span> : noteError ? <span className="text-[var(--state-danger)]">{noteError}</span> : <span />} 
          <span>{noteDraft.length}/500</span>
        </div>
      </section>

    </div>
  );
}

type AutoAssignRowProps = {
  label: string;
  value: number;
  pending: boolean;
  onClick: () => void;
};

function AutoAssignRow({ label, value, pending, onClick }: AutoAssignRowProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-lg bg-[var(--cc-bg-elev)] px-4 py-3 text-left text-sm text-[var(--cc-text)] transition hover:bg-[var(--cc-bg)]"
      onClick={onClick}
      disabled={pending}
    >
      <span>{label}</span>
      <span className="tabular-nums font-semibold">{pending ? "…" : fmtBRL(value)}</span>
    </button>
  );
}
