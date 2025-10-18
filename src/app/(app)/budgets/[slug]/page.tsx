// src/app/(app)/budgets/[slug]/page.tsx
"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams
} from "next/navigation";
import { ChevronDown, ChevronRight, MoreVertical, X } from "lucide-react";

import {
  calcularProjecaoMeta,
  fmtBRL,
  formatMonthLabel,
  formatarInputMonetario,
  mesAtual,
  normalizarValorMonetario
} from "@/domain/budgeting";
import {
  budgetPlannerSelectors,
  type BudgetAllocation,
  type BudgetCategory,
  type BudgetGoal,
  useBudgetPlannerStore
} from "@/stores/budgetPlannerStore";
import { AutoAssignModal, type AutoAssignCategory } from "@/components/orcamento/AutoAssignModal";
import { BudgetTopbar } from "@/components/orcamento/BudgetTopbar";
import { CategoryNameModal } from "@/components/orcamento/CategoryNameModal";
import { listCategoryActivity, monthToRange } from "@/domain/repo";

function shiftMonth(month: string, delta: number) {
  const [year, monthPart] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, (monthPart ?? 1) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + delta);
  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${shiftedYear}-${shiftedMonth}`;
}

const activityDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

type CollapsedMap = Record<string, boolean>;

type AddCategoryState = {
  open: boolean;
  groupId: string | null;
};

type CategoryWithData = {
  category: BudgetCategory;
  allocation: BudgetAllocation | undefined;
  previousAllocation: BudgetAllocation | undefined;
  goal: BudgetGoal | undefined;
};

type CategoryActivityRow = Awaited<ReturnType<typeof listCategoryActivity>>[number];

type ActivityModalState = {
  open: boolean;
  categoryId: string | null;
  categoryName: string;
  monthLabel: string;
  items: CategoryActivityRow[];
  loading: boolean;
  error: string | null;
};

type CategoryInspectorProps = {
  data: CategoryWithData | null;
  month: string;
  onClose: () => void;
  onArchive: () => void;
  onRename: () => void;
  onSaveGoal: (payload: {
    type: BudgetGoal["type"];
    amount_cents: number;
    target_month?: string | null;
    cadence?: BudgetGoal["cadence"];
  }) => Promise<void> | void;
  onApplyGoal: () => Promise<void> | void;
  onRemoveGoal: () => Promise<void> | void;
};

type InspectorPanelProps = {
  selected: CategoryWithData | null;
  month: string;
  readyToAssign: number;
  totals: { assigned: number; activity: number; available: number };
  onClose: () => void;
  onArchive: () => void;
  onRename: () => void;
  onSaveGoal: CategoryInspectorProps["onSaveGoal"];
  onApplyGoal: CategoryInspectorProps["onApplyGoal"];
  onRemoveGoal: CategoryInspectorProps["onRemoveGoal"];
};

type AddCategoryModalProps = {
  state: AddCategoryState;
  onClose: () => void;
  onSubmit: (payload: { name: string; group: string }) => Promise<void>;
  groups: string[];
};

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting?: boolean;
  tone?: "default" | "danger";
};

type GroupRowProps = {
  group: { id: string; name: string };
  collapsed: boolean;
  onToggle: () => void;
  onAddCategory: () => void;
};

type CategoryRowProps = {
  category: BudgetCategory;
  allocation: BudgetAllocation | undefined;
  goal: BudgetGoal | undefined;
  selected: boolean;
  onSelect: () => void;
  onClear: () => void;
  onRename: () => void;
  onAssign: (value: number) => void | Promise<void>;
  onShowActivity: () => void;
};

function availablePill(value: number) {
  const base = "inline-flex items-center justify-end rounded-full px-2 py-0.5 text-xs font-semibold tabular";
  if (value < 0) {
    return (
      <span className={`${base}`} style={{
        background: "var(--avail-negative-bg)",
        color: "var(--avail-negative-fg)"
      }}>
        {fmtBRL(value)}
      </span>
    );
  }
  if (value === 0) {
    return (
      <span className={`${base}`} style={{
        background: "var(--avail-zero-bg)",
        color: "var(--avail-zero-fg)"
      }}>
        {fmtBRL(value)}
      </span>
    );
  }
  return (
    <span className={`${base}`} style={{
      background: "var(--avail-positive-bg)",
      color: "var(--avail-positive-fg)"
    }}>
      {fmtBRL(value)}
    </span>
  );
}

function progressRatio({ allocation, goal }: { allocation: BudgetAllocation | undefined; goal: BudgetGoal | undefined }) {
  if (!allocation) return null;
  const available = allocation.available_cents;
  const targetAmount = goal?.amount_cents ?? 0;
  const projection = goal ? calcularProjecaoMeta(goal, allocation, allocation.month) : null;
  const upcomingNeeded = projection?.necessarioNoMes ?? 0;
  if (targetAmount <= 0 && upcomingNeeded <= 0) {
    return null;
  }
  const divisor = targetAmount > 0 ? targetAmount : upcomingNeeded;
  if (divisor <= 0) return null;
  const ratio = Math.max(0, Math.min(1, available / divisor));
  let className = "progress--under";
  if (available < 0) {
    className = "progress--neg";
  } else if (targetAmount > 0 && available >= targetAmount) {
    className = "progress--funded";
  } else if (targetAmount > 0 && available > targetAmount) {
    className = "progress--over";
  }
  return { ratio, className } as const;
}

function renderProgress({ allocation, goal }: { allocation: BudgetAllocation | undefined; goal: BudgetGoal | undefined }) {
  const result = progressRatio({ allocation, goal });
  if (!result) return null;
  return (
    <div className="progress" aria-hidden>
      <span className={result.className} style={{ width: `${result.ratio * 100}%` }} />
    </div>
  );
}

function GroupRow({ group, collapsed, onToggle, onAddCategory }: GroupRowProps) {
  return (
    <div className="row group-row tabular" role="row">
      <div className="name-cell">
        <button
          type="button"
          className="flex items-center gap-1 text-left text-sm font-semibold"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={`Alternar grupo ${group.name}`}
        >
          {collapsed ? <ChevronRight size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          <span className="truncate">{group.name}</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn-link" onClick={onAddCategory}>
            ＋ Adicionar categoria
          </button>
        </div>
      </div>
      <div className="text-right pr-2" />
      <div className="text-right pr-2" />
      <div className="text-right pr-2" />
    </div>
  );
}

function CategoryRow({
  category,
  allocation,
  goal,
  selected,
  onSelect,
  onClear,
  onRename,
  onAssign,
  onShowActivity
}: CategoryRowProps) {
  const emoji = category.icon ?? "🏷️";
  const assigned = allocation?.assigned_cents ?? 0;
  const activity = allocation?.activity_cents ?? 0;
  const available = allocation?.available_cents ?? 0;
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(formatarInputMonetario(assigned));
  const [rawValue, setRawValue] = useState(assigned);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClear();
    }
  };

  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatarInputMonetario(assigned));
      setRawValue(assigned);
    }
  }, [assigned, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const cents = normalizarValorMonetario(event.target.value);
    setRawValue(cents);
    setInputValue(formatarInputMonetario(cents));
  };

  const commitValue = () => {
    if (rawValue !== assigned) {
      void onAssign(rawValue);
    }
    setIsEditing(false);
  };

  const handleInputBlur = () => {
    commitValue();
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitValue();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setInputValue(formatarInputMonetario(assigned));
      setRawValue(assigned);
      setIsEditing(false);
    }
  };

  const openEditor = () => {
    setIsEditing(true);
    onSelect();
  };

  return (
    <div
      className="row tabular cursor-pointer"
      role="row"
      tabIndex={0}
      aria-selected={selected}
      data-selected={selected ? "true" : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="name-cell">
        <input type="checkbox" aria-label="selecionar linha" className="h-4 w-4" tabIndex={-1} />
        <span className="shrink-0" aria-hidden>
          {emoji}
        </span>
        <div className="flex-1 overflow-hidden">
          <button
            type="button"
            className="inline-flex max-w-full truncate text-left text-sm font-medium text-[var(--cc-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            onClick={(event) => {
              event.stopPropagation();
              onRename();
            }}
          >
            <span className="truncate">{category.name}</span>
          </button>
        </div>
        {renderProgress({ allocation, goal })}
      </div>
      <div className="flex justify-end pr-2">
        {isEditing ? (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={(event) => {
              event.stopPropagation();
              handleInputKeyDown(event);
            }}
            onClick={(event) => event.stopPropagation()}
            className="w-full min-w-[7rem] rounded-lg border border-[var(--ring)] bg-white px-2 py-1 text-right text-sm font-semibold text-[var(--cc-text)] shadow-sm focus:outline-none"
            inputMode="numeric"
            aria-label={`Editar atribuição de ${category.name}`}
          />
        ) : (
          <button
            type="button"
            className="min-w-[7rem] rounded-lg border border-transparent px-2 py-1 text-right text-sm font-semibold text-[var(--cc-text)] transition hover:border-[var(--cc-border)] hover:bg-[var(--tbl-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            onClick={(event) => {
              event.stopPropagation();
              openEditor();
            }}
          >
            {fmtBRL(assigned)}
          </button>
        )}
      </div>
      <div className="text-right pr-2">
        <button
          type="button"
          className="min-w-[6.5rem] rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-[var(--cc-text-muted)] transition hover:border-[var(--cc-border)] hover:bg-[var(--tbl-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          onClick={(event) => {
            event.stopPropagation();
            onShowActivity();
          }}
        >
          {fmtBRL(activity)}
        </button>
      </div>
      <div className="text-right pr-2">{availablePill(available)}</div>
    </div>
  );
}

function SummaryCard({ title, value, description }: { title: string; value: string; description?: string }) {
  return (
    <div className="card">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-muted)]">{title}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--cc-text)]">{value}</p>
      {description ? <p className="mt-1 text-xs text-[var(--cc-text-muted)]">{description}</p> : null}
    </div>
  );
}

function CategoryActivityModal({ state, onClose }: { state: ActivityModalState; onClose: () => void }) {
  if (!state.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-[var(--tbl-border)] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--tbl-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--cc-text)]">Atividades da categoria</h2>
            <p className="text-sm text-[var(--cc-text-muted)]">
              {state.categoryName} · {state.monthLabel}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-transparent p-1 text-[var(--cc-text-muted)] transition hover:border-[var(--cc-border)] hover:text-[var(--cc-text)]"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto px-6 py-5">
          {state.loading ? (
            <p className="text-sm text-[var(--cc-text-muted)]">Carregando atividades…</p>
          ) : state.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : state.items.length === 0 ? (
            <p className="text-sm text-[var(--cc-text-muted)]">Nenhuma movimentação registrada para este mês.</p>
          ) : (
            <ul className="space-y-3">
              {state.items.map((item) => {
                const signed = item.direction === "outflow" ? -item.amount_cents : item.amount_cents;
                const tone = signed < 0 ? "text-rose-600" : "text-emerald-600";
                const dateLabel = item.date
                  ? activityDateFormatter.format(new Date(`${item.date}T00:00:00`))
                  : "—";
                const accountName = Array.isArray(item.account)
                  ? item.account[0]?.name ?? null
                  : (item.account as { name?: string } | null)?.name ?? null;
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-[var(--tbl-border)] bg-[var(--cc-bg-elev)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[var(--cc-text)]">
                          {item.description || "Sem descrição"}
                        </p>
                        <p className="text-xs text-[var(--cc-text-muted)]">
                          {dateLabel}
                          {accountName ? ` • ${accountName}` : ""}
                        </p>
                        {item.memo ? (
                          <p className="text-xs text-[var(--cc-text-muted)]">{item.memo}</p>
                        ) : null}
                      </div>
                      <span className={`text-sm font-semibold ${tone}`}>{fmtBRL(signed)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryInspector({ month, readyToAssign, totals }: { month: string; readyToAssign: number; totals: { assigned: number; activity: number; available: number } }) {
  const monthLabel = useMemo(() => {
    const [year, monthPart] = month.split("-");
    const date = new Date(Date.UTC(Number(year), Number(monthPart) - 1, 1));
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(date);
  }, [month]);

  return (
    <div>
      <div className="card">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--cc-text-muted)]">Resumo do mês</p>
        <h2 className="mt-2 text-xl font-semibold leading-tight text-[var(--cc-text)]">{monthLabel}</h2>
        <p className="mt-3 text-xs text-[var(--cc-text-muted)]">
          Distribua o orçamento disponível para alcançar suas metas financeiras.
        </p>
      </div>
      <SummaryCard
        title="Pronto para atribuir"
        value={fmtBRL(readyToAssign)}
        description="Saldo a distribuir neste mês"
      />
      <SummaryCard title="Atribuído" value={fmtBRL(totals.assigned)} description="Total destinado às categorias" />
      <SummaryCard title="Atividade" value={fmtBRL(totals.activity)} description="Movimentações do mês" />
      <SummaryCard title="Disponível" value={fmtBRL(totals.available)} description="Quanto resta após a atividade" />
    </div>
  );
}

type GoalFormState = {
  amountInput: string;
  cadence: "weekly" | "monthly" | "yearly" | "custom";
  type: BudgetGoal["type"];
  targetMonth: string | null;
};

const GOAL_FREQUENCY_OPTIONS: ReadonlyArray<{
  cadence: GoalFormState["cadence"];
  label: string;
  type: BudgetGoal["type"];
}> = [
  { cadence: "weekly", label: "Semanal", type: "CUSTOM" },
  { cadence: "monthly", label: "Mensal", type: "MFG" },
  { cadence: "yearly", label: "Anual", type: "TBD" },
  { cadence: "custom", label: "Personalizado", type: "CUSTOM" }
];

const GOAL_TYPE_LABELS: Record<BudgetGoal["type"], string> = {
  MFG: "Meta mensal",
  TB: "Saldo desejado",
  TBD: "Meta com data",
  CUSTOM: "Meta personalizada"
};

function goalDescription(goal: BudgetGoal) {
  switch (goal.type) {
    case "MFG":
      return "Reserve esse valor todo mês.";
    case "TB":
      return "Mantenha esse saldo disponível.";
    case "TBD": {
      const monthKey = goal.target_month ? goal.target_month.slice(0, 7) : null;
      return monthKey ? `Atingir até ${formatMonthLabel(monthKey)}.` : "Defina uma data final para essa meta.";
    }
    case "CUSTOM":
    default:
      return "Adapte o valor conforme sua estratégia.";
  }
}

function getInitialGoalForm(goal: BudgetGoal | undefined): GoalFormState {
  return {
    amountInput: formatarInputMonetario(goal?.amount_cents ?? 0),
    cadence: goal?.cadence ?? "monthly",
    type: goal?.type ?? "MFG",
    targetMonth: goal?.target_month ? goal.target_month.slice(0, 7) : null
  };
}

function CategoryInspector({
  data,
  month,
  onClose,
  onArchive,
  onRename,
  onSaveGoal,
  onApplyGoal,
  onRemoveGoal
}: CategoryInspectorProps) {
  const goal = data?.goal;
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [form, setForm] = useState<GoalFormState>(() => getInitialGoalForm(goal));
  const [savingGoal, setSavingGoal] = useState(false);
  const [applyingGoal, setApplyingGoal] = useState(false);
  const [removingGoal, setRemovingGoal] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const definirToast = useBudgetPlannerStore((s) => s.definirToast);
  const actionsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    setForm(getInitialGoalForm(goal));
    setIsEditingGoal(false);
  }, [goal]);

  if (!data) return null;

  const { category, allocation, previousAllocation } = data;
  const assigned = allocation?.assigned_cents ?? 0;
  const activity = allocation?.activity_cents ?? 0;
  const available = allocation?.available_cents ?? 0;
  const prevAvailable = allocation?.prev_available_cents ?? previousAllocation?.available_cents ?? 0;
  const emoji = category.icon ?? "🏷️";
  const projection = goal && allocation ? calcularProjecaoMeta(goal, allocation, month) : null;
  const monthLabel = formatMonthLabel(month);
  const previousMonthKey = shiftMonth(month, -1);
  const previousMonthLabel = formatMonthLabel(previousMonthKey);

  const recommendedAssign = projection ? Math.max(projection.falta, projection.necessarioNoMes) : 0;
  const progressPercent = projection ? Math.min(100, Math.round((projection.progresso ?? 0) * 100)) : 0;

  const summaryHighlights: Array<{ label: string; value: string }> = [
    { label: `Atribuído em ${monthLabel}`, value: fmtBRL(assigned) },
    { label: `Gasto em ${monthLabel}`, value: fmtBRL(activity) },
    { label: `Saldo que sobrou de ${previousMonthLabel}`, value: fmtBRL(prevAvailable) }
  ];

  const startEditingGoal = () => {
    setForm(getInitialGoalForm(goal));
    setIsEditingGoal(true);
  };

  const handleCancelGoal = () => {
    setForm(getInitialGoalForm(goal));
    setIsEditingGoal(false);
  };

  const handleSubmitGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = normalizarValorMonetario(form.amountInput);
    if (value <= 0) {
      definirToast({ type: "error", message: "Informe um valor maior que zero para a meta." });
      return;
    }
    if (form.type === "TBD" && !form.targetMonth) {
      definirToast({ type: "error", message: "Defina um mês-alvo para esta meta." });
      return;
    }
    setSavingGoal(true);
    try {
      await onSaveGoal({
        type: form.type,
        amount_cents: value,
        target_month: form.type === "TBD" ? (form.targetMonth ? `${form.targetMonth}-01` : null) : null,
        cadence: form.cadence
      });
      definirToast({ type: "success", message: "Meta salva com sucesso." });
      setIsEditingGoal(false);
    } catch (error) {
      console.error(error);
      definirToast({ type: "error", message: "Não foi possível salvar a meta." });
    } finally {
      setSavingGoal(false);
    }
  };

  const handleApplyGoal = async () => {
    if (!projection || recommendedAssign <= 0) return;
    setApplyingGoal(true);
    try {
      await onApplyGoal();
      definirToast({ type: "success", message: "Valor atribuído conforme a meta." });
    } catch (error) {
      console.error(error);
      definirToast({ type: "error", message: "Não foi possível aplicar a meta." });
    } finally {
      setApplyingGoal(false);
    }
  };

  const handleRemoveGoal = () => {
    if (!goal) return;
    setConfirmRemoveOpen(true);
  };

  const confirmRemoveGoal = async () => {
    if (!goal) {
      setConfirmRemoveOpen(false);
      return;
    }
    setRemovingGoal(true);
    try {
      await onRemoveGoal();
      setIsEditingGoal(false);
      setForm(getInitialGoalForm(undefined));
      setConfirmRemoveOpen(false);
      definirToast({ type: "info", message: "Meta removida." });
    } catch (error) {
      console.error(error);
      definirToast({ type: "error", message: "Não foi possível remover a meta." });
    } finally {
      setRemovingGoal(false);
    }
  };

  const goalContent = (() => {
    if (isEditingGoal) {
      return (
        <form className="space-y-5" onSubmit={handleSubmitGoal}>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[var(--cc-text)]">
              {goal ? "Editar meta" : "Criar meta"}
            </h3>
            <p className="text-sm text-[var(--cc-text-muted)]">
              {goal
                ? "Ajuste o valor e a frequência para manter esta categoria em dia."
                : `Defina um objetivo para ${category.name} e acompanhe quanto falta para alcançar.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist">
            {GOAL_FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.cadence}
                type="button"
                role="tab"
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  form.cadence === option.cadence
                    ? "border-amber-500 bg-amber-50 text-[var(--cc-text)]"
                    : "border-[var(--cc-border)] bg-[var(--cc-bg-elev)] text-[var(--cc-text-muted)] hover:border-[var(--cc-text-muted)]"
                }`}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    cadence: option.cadence,
                    type: option.type
                  }))
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--cc-text)]">
            <span>Preciso de</span>
            <input
              value={form.amountInput}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  amountInput: formatarInputMonetario(normalizarValorMonetario(event.target.value))
                }))
              }
              inputMode="numeric"
              className="rounded-xl border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-2 text-sm font-semibold shadow-sm focus:border-[var(--ring)] focus:outline-none"
            />
          </label>

          {form.type === "TBD" ? (
            <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--cc-text)]">
              <span>Até</span>
              <input
                type="month"
                value={form.targetMonth ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetMonth: event.target.value || null
                  }))
                }
                required
                className="rounded-xl border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-2 text-sm font-semibold shadow-sm focus:border-[var(--ring)] focus:outline-none"
              />
            </label>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--cc-border)] pt-4">
            {goal ? (
              <button
                type="button"
                className="mr-auto text-sm font-semibold text-[var(--state-danger)] hover:underline"
                onClick={handleRemoveGoal}
                disabled={removingGoal}
              >
                {removingGoal ? "Removendo…" : "Excluir meta"}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full border border-[var(--cc-border)] px-4 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
              onClick={handleCancelGoal}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-[var(--cc-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={savingGoal}
            >
              {savingGoal ? "Salvando…" : goal ? "Salvar alterações" : "Criar meta"}
            </button>
          </div>
        </form>
      );
    }

    if (!goal) {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[var(--cc-text)]">Planeje uma meta</h3>
            <p className="text-sm text-[var(--cc-text-muted)]">
              Crie um objetivo para {category.name} e saiba exatamente quanto separar a cada mês.
            </p>
          </div>
          <button
            type="button"
            className="w-full rounded-full bg-[var(--cc-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 sm:w-auto"
            onClick={startEditingGoal}
          >
            Criar meta
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">{GOAL_TYPE_LABELS[goal.type]}</p>
            <h3 className="text-xl font-semibold text-[var(--cc-text)]">{fmtBRL(goal.amount_cents)}</h3>
            <p className="text-sm text-[var(--cc-text-muted)]">{goalDescription(goal)}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-[var(--cc-border)] px-4 py-2 text-xs font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
            onClick={startEditingGoal}
          >
            Ajustar meta
          </button>
        </div>

        {projection ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#f97316 ${progressPercent * 3.6}deg, #fef3c7 0deg)`
                  }}
                  aria-hidden
                />
                <div className="absolute inset-3 rounded-full bg-[var(--cc-surface)]" />
                <span className="relative text-lg font-semibold text-[var(--cc-text)]">{progressPercent}%</span>
              </div>
              <div className="space-y-2 text-center text-sm text-[var(--cc-text)] sm:text-left">
                <p className="font-semibold">
                  {recommendedAssign > 0
                    ? `Separe ${fmtBRL(recommendedAssign)} para alcançar a meta deste mês.`
                    : "Você está em dia com esta meta."}
                </p>
                <p className="text-[var(--cc-text-muted)]">
                  Alcance {fmtBRL(projection.alvo)} mantendo as contribuições planejadas.
                </p>
              </div>
            </div>

            {recommendedAssign > 0 ? (
              <button
                type="button"
                className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                onClick={handleApplyGoal}
                disabled={applyingGoal}
              >
                {applyingGoal ? "Aplicando…" : `Atribuir ${fmtBRL(recommendedAssign)}`}
              </button>
            ) : null}

            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[var(--cc-bg-elev)] px-4 py-3 text-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">Necessário este mês</dt>
                <dd className="mt-1 text-base font-semibold text-[var(--cc-text)]">
                  {fmtBRL(projection.necessarioNoMes)}
                </dd>
              </div>
              <div className="rounded-2xl bg-[var(--cc-bg-elev)] px-4 py-3 text-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">Já atribuído</dt>
                <dd className="mt-1 text-base font-semibold text-[var(--cc-text)]">{fmtBRL(projection.atribuido)}</dd>
              </div>
              <div className="rounded-2xl bg-[var(--cc-bg-elev)] px-4 py-3 text-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">Saldo disponível</dt>
                <dd className="mt-1 text-base font-semibold text-[var(--cc-text)]">
                  {fmtBRL(allocation?.available_cents ?? 0)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-[var(--cc-text-muted)]">Nenhuma projeção disponível para esta meta.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="text-sm font-semibold text-[var(--state-danger)] underline-offset-4 hover:underline"
            onClick={handleRemoveGoal}
            disabled={removingGoal}
          >
            {removingGoal ? "Removendo…" : "Remover meta"}
          </button>
        </div>
      </div>
    );
  })();

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-2xl">
            {emoji}
          </span>
          <div className="space-y-0.5">
            <p className="text-base font-semibold text-[var(--cc-text)]">{category.name}</p>
            <p className="text-xs text-[var(--cc-text-muted)]">{category.group_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="text-sm font-semibold text-[var(--cc-text-muted)] hover:underline" onClick={onClose}>
            Limpar seleção
          </button>
          <details ref={actionsRef} className="relative">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-transparent text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-bg-elev)]"
              aria-label="Mais ações"
            >
              <MoreVertical size={16} />
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-44 rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-2 shadow-[var(--shadow-1)]">
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--cc-text)] hover:bg-[var(--cc-bg)]"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  actionsRef.current?.removeAttribute("open");
                  onRename();
                }}
              >
                Renomear categoria
              </button>
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--state-danger)] hover:bg-[var(--cc-bg)]"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  actionsRef.current?.removeAttribute("open");
                  onArchive();
                }}
              >
                Arquivar categoria
              </button>
            </div>
          </details>
        </div>
      </header>

      <section className="rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 shadow-[var(--shadow-1)]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-[var(--cc-bg)] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cc-text-muted)]">Disponível</p>
                <p className="text-xs text-[var(--cc-text-muted)]">Inclui {fmtBRL(prevAvailable)} de {previousMonthLabel}</p>
              </div>
              <p
                className={`text-2xl font-semibold ${
                  available < 0 ? "text-[var(--state-danger)]" : "text-[var(--cc-text)]"
                }`}
              >
                {fmtBRL(available)}
              </p>
            </div>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
              {summaryHighlights.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] px-4 py-3 shadow-[var(--shadow-1)]"
                >
                  <dt className="text-[var(--cc-text-muted)]">{item.label}</dt>
                  <dd className="text-sm font-semibold text-[var(--cc-text)]">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="h-px w-full bg-[var(--cc-border)]" />

          <div className="space-y-6">{goalContent}</div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmRemoveOpen}
        title="Remover meta"
        description="Essa ação removerá a meta atual desta categoria. Você poderá definir outra meta depois."
        confirmLabel="Remover"
        tone="danger"
        onClose={() => {
          if (!removingGoal) {
            setConfirmRemoveOpen(false);
          }
        }}
        onConfirm={confirmRemoveGoal}
        isSubmitting={removingGoal}
      />
    </div>
  );
}

function InspectorPanel({
  selected,
  month,
  readyToAssign,
  totals,
  onClose,
  onArchive,
  onRename,
  onSaveGoal,
  onApplyGoal,
  onRemoveGoal
}: InspectorPanelProps) {
  return (
    <aside className="inspector" aria-label="Painel do orçamento">
      {selected ? (
        <CategoryInspector
          data={selected}
          month={month}
          onClose={onClose}
          onArchive={onArchive}
          onRename={onRename}
          onSaveGoal={onSaveGoal}
          onApplyGoal={onApplyGoal}
          onRemoveGoal={onRemoveGoal}
        />
      ) : (
        <SummaryInspector month={month} readyToAssign={readyToAssign} totals={totals} />
      )}
    </aside>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  onClose,
  onConfirm,
  isSubmitting,
  tone = "default"
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClassName =
    tone === "danger"
      ? "rounded-lg bg-[var(--state-danger)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-70"
      : "btn-primary";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-[var(--cc-border)] bg-white p-6 text-[var(--cc-text)] shadow-[var(--shadow-2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--cc-text-muted)]">{description}</p>
          ) : null}
        </header>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-link" onClick={onClose} disabled={isSubmitting}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClassName}
            onClick={() => {
              if (!isSubmitting) {
                void onConfirm();
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Confirmando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCategoryModal({ state, onClose, onSubmit, groups }: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<string>(groups[0] ?? "");
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    if (state.open && !wasOpen) {
      setName("");
    }
    if (state.open) {
      if (state.groupId && groups.includes(state.groupId)) {
        setGroup(state.groupId);
      } else if (!groups.includes(group)) {
        setGroup(groups[0] ?? "");
      } else if (!wasOpen) {
        setGroup(groups[0] ?? "");
      }
    }
    if (!state.open && wasOpen) {
      setName("");
    }
    wasOpenRef.current = state.open;
  }, [group, groups, state.groupId, state.open]);

  if (!state.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          await onSubmit({ name: name.trim(), group });
        }}
        className="w-full max-w-md rounded-[var(--radius)] border border-[var(--cc-border)] bg-white p-6 shadow-[var(--shadow-2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--cc-text)]">Adicionar categoria</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-[var(--cc-text-muted)] hover:bg-[var(--tbl-row-hover)]">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[var(--cc-text)]">
            Nome
            <input
              required
              className="mt-1 w-full rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ring)] focus:outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-[var(--cc-text)]">
            Grupo
            <select
              required
              className="mt-1 w-full rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ring)] focus:outline-none"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
            >
              {groups.map((nameOption) => (
                <option key={nameOption} value={nameOption}>
                  {nameOption}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-link" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Adicionar
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BudgetMonthPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? "";

  const initializeMonth = useBudgetPlannerStore((s) => s.initializeMonth);
  const selecionarMes = useBudgetPlannerStore((s) => s.selecionarMes);
  const abrirModalNome = useBudgetPlannerStore((s) => s.abrirModalNome);
  const fecharOverlays = useBudgetPlannerStore((s) => s.fecharOverlays);
  const alternarOcultas = useBudgetPlannerStore((s) => s.alternarOcultas);
  const salvarNome = useBudgetPlannerStore((s) => s.salvarNome);
  const ocultarCategoria = useBudgetPlannerStore((s) => s.ocultarCategoria);
  const excluirCategoria = useBudgetPlannerStore((s) => s.excluirCategoria);
  const editarAtribuido = useBudgetPlannerStore((s) => s.editarAtribuido);
  const salvarMeta = useBudgetPlannerStore((s) => s.salvarMeta);
  const aplicarMeta = useBudgetPlannerStore((s) => s.aplicarMeta);
  const removerMeta = useBudgetPlannerStore((s) => s.removerMeta);
  const desfazer = useBudgetPlannerStore((s) => s.desfazer);
  const refazer = useBudgetPlannerStore((s) => s.refazer);
  const definirToast = useBudgetPlannerStore((s) => s.definirToast);
  const criarCategoria = useBudgetPlannerStore((s) => s.criarCategoria);

  const ui = budgetPlannerSelectors.useUI();
  const categories = budgetPlannerSelectors.useCategories();
  const groups = budgetPlannerSelectors.useGroups();
  const monthSelected = budgetPlannerSelectors.useMonth();
  const currentMonth = monthSelected ?? mesAtual();
  const previousMonth = shiftMonth(currentMonth, -1);
  const readyToAssign = budgetPlannerSelectors.useReadyToAssign(currentMonth);
  const totals = budgetPlannerSelectors.useTotals(currentMonth);
  const toast = budgetPlannerSelectors.useToast();
  const loading = budgetPlannerSelectors.useLoading();
  const error = useBudgetPlannerStore((s) => s.error);
  const allocations = useBudgetPlannerStore((s) => s.allocations.byCategoryIdMonth);
  const goals = useBudgetPlannerStore((s) => s.goals.byCategoryId);
  const history = useBudgetPlannerStore((s) => s.history);

  const [collapsed, setCollapsed] = useState<CollapsedMap>({});
  const [addCategory, setAddCategory] = useState<AddCategoryState>({ open: false, groupId: null });
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (!searchParamsString) return null;
    const params = new URLSearchParams(searchParamsString);
    return params.get("cat");
  });
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignSubmitting, setAutoAssignSubmitting] = useState(false);
  const [activityModal, setActivityModal] = useState<ActivityModalState>(() => ({
    open: false,
    categoryId: null,
    categoryName: "",
    monthLabel: formatMonthLabel(mesAtual()),
    items: [],
    loading: false,
    error: null
  }));

  const didInitRef = useRef(false);
  const syncingUrlRef = useRef(false);
  const initialMonthRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname?.startsWith("/budgets")) return;
    if (didInitRef.current) return;
    didInitRef.current = true;

    const slugMonth = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;
    let queryMonth: string | null = null;
    if (typeof window !== "undefined") {
      queryMonth = new URLSearchParams(window.location.search).get("m");
    }
    const initial = (queryMonth ?? slugMonth ?? mesAtual()).slice(0, 7);
    initialMonthRef.current = initial;

    void initializeMonth(initial);

    if (typeof window !== "undefined" && queryMonth) {
      const desiredPath = `/budgets/${initial}`;
      if (pathname !== desiredPath) {
        syncingUrlRef.current = true;
        router.replace(desiredPath, { scroll: false });
        queueMicrotask(() => {
          syncingUrlRef.current = false;
        });
      }
    }
  }, [initializeMonth, params?.slug, pathname, router]);

  useEffect(() => {
    if (!monthSelected) return;
    if (!pathname?.startsWith("/budgets")) return;
    if (syncingUrlRef.current) return;

    const desiredPath = `/budgets/${monthSelected}`;
    if (pathname !== desiredPath) {
      syncingUrlRef.current = true;
      router.replace(desiredPath, { scroll: false });
      queueMicrotask(() => {
        syncingUrlRef.current = false;
      });
    }
  }, [monthSelected, pathname, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => definirToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast, definirToast]);

  useEffect(() => {
    setCollapsed((prev) => {
      const next: CollapsedMap = { ...prev };
      groups.forEach((group) => {
        if (next[group.name] === undefined) {
          next[group.name] = false;
        }
      });
      return next;
    });
  }, [groups]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const paramId = params.get("cat");
    setSelectedId(paramId);
  }, [searchParamsString]);

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (!pathname?.startsWith("/budgets")) {
        return;
      }
      const paramsObj = new URLSearchParams(searchParamsString);
      if (!id) paramsObj.delete("cat");
      else paramsObj.set("cat", id);
      const query = paramsObj.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParamsString]
  );

  const closeSelection = useCallback(() => {
    select(null);
  }, [select]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) refazer();
        else desfazer();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeSelection();
        fecharOverlays();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeSelection, desfazer, refazer, fecharOverlays]);

  const handleAssign = useCallback(
    async (categoryId: string, value: number) => {
      await editarAtribuido(categoryId, value);
    },
    [editarAtribuido]
  );

  const handleAutoAssignConfirm = useCallback(
    async (assignments: Array<{ categoryId: string; value: number }>) => {
      setAutoAssignSubmitting(true);
      try {
        for (const assignment of assignments) {
          await editarAtribuido(assignment.categoryId, assignment.value);
        }
        setAutoAssignOpen(false);
      } catch (error) {
        console.error(error);
        definirToast({
          type: "error",
          message: "Não foi possível distribuir automaticamente. Tente novamente."
        });
      } finally {
        setAutoAssignSubmitting(false);
      }
    },
    [definirToast, editarAtribuido]
  );

  const openActivityModal = useCallback(
    (categoryId: string | null, categoryName: string) => {
      const [yearStr, monthStr] = currentMonth.split("-");
      const year = Number(yearStr);
      const monthNumber = Number(monthStr);
      const label = formatMonthLabel(currentMonth);

      if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) {
        setActivityModal({
          open: true,
          categoryId,
          categoryName,
          monthLabel: label,
          items: [],
          loading: false,
          error: "Mês inválido para consultar as atividades."
        });
        return;
      }

      const { s, e } = monthToRange({ year, month: monthNumber });

      setActivityModal({
        open: true,
        categoryId,
        categoryName,
        monthLabel: label,
        items: [],
        loading: true,
        error: null
      });

      listCategoryActivity(categoryId, { start: s, end: e })
        .then((data) => {
          setActivityModal((prev) => ({
            ...prev,
            items: Array.isArray(data) ? data : [],
            loading: false
          }));
        })
        .catch((error: any) => {
          setActivityModal((prev) => ({
            ...prev,
            loading: false,
            error: error?.message ?? "Não foi possível carregar as atividades desta categoria."
          }));
        });
    },
    [currentMonth]
  );

  const closeActivityModal = useCallback(() => {
    setActivityModal((prev) => ({ ...prev, open: false }));
  }, []);

  const groupsWithAllocations = useMemo(() => {
    return groups.map((group) => ({
      id: group.name,
      name: group.name,
      categories: group.categories.map((category) => ({
        category,
        allocation: allocations[category.id]?.[currentMonth],
        goal: goals[category.id]
      }))
    }));
  }, [allocations, currentMonth, goals, groups]);

  const autoAssignCategories = useMemo<AutoAssignCategory[]>(() => {
    return categories
      .filter((category) => !category.deleted_at)
      .map((category) => {
        const allocation = allocations[category.id]?.[currentMonth];
        return {
          id: category.id,
          name: category.name,
          group: category.group_name,
          assignedCents: allocation?.assigned_cents ?? 0,
          isHidden: category.is_hidden,
          isDeleted: Boolean(category.deleted_at)
        } satisfies AutoAssignCategory;
      });
  }, [allocations, categories, currentMonth]);

  const selectedData: CategoryWithData | null = useMemo(() => {
    if (!selectedId) return null;
    const category = categories.find((item) => item.id === selectedId);
    if (!category) return null;
    const previousAllocation = allocations[category.id]?.[previousMonth];
    return {
      category,
      allocation: allocations[category.id]?.[currentMonth],
      previousAllocation,
      goal: goals[category.id]
    };
  }, [allocations, categories, currentMonth, goals, previousMonth, selectedId]);

  const modalCategory = categories.find((cat) => cat.id === ui.nameModalId) ?? null;

  const handleAddCategory = async ({ name, group }: { name: string; group: string }) => {
    try {
      await criarCategoria(group, name);
    } finally {
      setAddCategory({ open: false, groupId: null });
    }
  };

  return (
    <main className="px-4">
      <div className="flex flex-1 flex-col gap-6 py-6">
        <BudgetTopbar
          month={currentMonth}
          readyToAssignCents={readyToAssign}
          onGoPrevious={() => {
            if (!currentMonth) return;
            void selecionarMes(shiftMonth(currentMonth, -1));
          }}
          onGoNext={() => {
            if (!currentMonth) return;
            void selecionarMes(shiftMonth(currentMonth, 1));
          }}
          onOpenGroups={alternarOcultas}
          onOpenAutoAssign={() => setAutoAssignOpen(true)}
          onUndo={desfazer}
          onRedo={refazer}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          autoAssignDisabled={autoAssignCategories.length === 0 || readyToAssign <= 0}
        />

        {error ? (
          <div className="rounded-2xl border border-[var(--state-danger)] bg-rose-50 px-4 py-3 text-sm text-rose-600 shadow-sm">
            {error}
          </div>
        ) : null}

        <section className="budget-grid">
          <div className="left-wide">
            <div className="mb-2 flex items-center gap-2">
              <button className="btn-link" type="button" onClick={alternarOcultas}>
                Grupos de categorias
              </button>
              <button
                className="btn-primary"
                type="button"
                onClick={() => setAddCategory({ open: true, groupId: groups[0]?.name ?? null })}
              >
                ＋ Adicionar categoria
              </button>
            </div>

            <div className="tbl-head row tabular">
              <div className="cell">CATEGORIA</div>
              <div className="cell justify-end">ATRIBUÍDO</div>
              <div className="cell justify-end">ATIVIDADE</div>
              <div className="cell justify-end">DISPONÍVEL</div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-lg border border-[var(--tbl-border)] bg-white px-4 py-8 text-center text-sm text-[var(--cc-text-muted)]">
                Carregando orçamento…
              </div>
            ) : (
              groupsWithAllocations.map((group) => (
                <Fragment key={group.id}>
                  <GroupRow
                    group={{ id: group.id, name: group.name }}
                    collapsed={collapsed[group.id] ?? false}
                    onToggle={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [group.id]: !prev[group.id]
                      }))
                    }
                    onAddCategory={() => setAddCategory({ open: true, groupId: group.name })}
                  />
                  {(collapsed[group.id] ?? false)
                    ? null
                    : group.categories.map((item) => (
                        <CategoryRow
                          key={item.category.id}
                          category={item.category}
                          allocation={item.allocation}
                          goal={item.goal}
                          selected={selectedId === item.category.id}
                          onSelect={() => select(item.category.id)}
                          onClear={closeSelection}
                          onRename={() => abrirModalNome(item.category.id)}
                          onAssign={(value) => handleAssign(item.category.id, value)}
                          onShowActivity={() =>
                            openActivityModal(item.category.id, item.category.name)
                          }
                        />
                      ))}
                </Fragment>
              ))
            )}
          </div>

          <InspectorPanel
            selected={selectedData}
            month={currentMonth}
            readyToAssign={readyToAssign}
            totals={totals}
            onClose={closeSelection}
            onArchive={() => {
              if (!selectedData) return;
              void ocultarCategoria(selectedData.category.id);
            }}
            onRename={() => {
              if (!selectedData) return;
              abrirModalNome(selectedData.category.id);
            }}
            onSaveGoal={async (payload) => {
              if (!selectedData) return;
              await salvarMeta(selectedData.category.id, payload);
            }}
            onApplyGoal={async () => {
              if (!selectedData) return;
              await aplicarMeta(selectedData.category.id);
            }}
            onRemoveGoal={async () => {
              if (!selectedData) return;
              await removerMeta(selectedData.category.id);
            }}
          />
        </section>
      </div>

      <CategoryActivityModal state={activityModal} onClose={closeActivityModal} />

      {modalCategory && (
        <CategoryNameModal
          category={modalCategory}
          onCancel={fecharOverlays}
          onConfirm={(name) => {
            void salvarNome(modalCategory.id, name);
          }}
          onHide={() => {
            void ocultarCategoria(modalCategory.id);
          }}
          onDelete={() => {
            void excluirCategoria(modalCategory.id);
          }}
        />
      )}

      <AutoAssignModal
        open={autoAssignOpen}
        onClose={() => {
          if (autoAssignSubmitting) return;
          setAutoAssignOpen(false);
        }}
        onConfirm={handleAutoAssignConfirm}
        categories={autoAssignCategories}
        readyToAssignCents={readyToAssign}
        isSubmitting={autoAssignSubmitting}
      />

      <AddCategoryModal
        state={addCategory}
        onClose={() => setAddCategory({ open: false, groupId: null })}
        onSubmit={handleAddCategory}
        groups={groups.map((group) => group.name)}
      />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-500"
              : toast.type === "error"
              ? "bg-rose-500"
              : "bg-slate-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}
