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
import { BudgetTopbar } from "@/components/orcamento/BudgetTopbar";
import { CategoryNameModal } from "@/components/orcamento/CategoryNameModal";

function shiftMonth(month: string, delta: number) {
  const [year, monthPart] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, (monthPart ?? 1) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + delta);
  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${shiftedYear}-${shiftedMonth}`;
}

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

type CategoryInspectorProps = {
  data: CategoryWithData | null;
  month: string;
  onClose: () => void;
  onAssign: (value: number) => void;
  onMove: (value: number) => void;
  onReset: () => void;
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
  onAssign: (value: number) => void;
  onMove: (value: number) => void;
  onReset: () => void;
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

function CategoryRow({ category, allocation, goal, selected, onSelect, onClear, onRename, onAssign }: CategoryRowProps) {
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
      <div className="text-right pr-2">{fmtBRL(activity)}</div>
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
  onAssign,
  onMove,
  onReset,
  onArchive,
  onRename,
  onSaveGoal,
  onApplyGoal,
  onRemoveGoal
}: CategoryInspectorProps) {
  const goal = data?.goal;
  const [isEditingGoal, setIsEditingGoal] = useState(() => !goal);
  const [form, setForm] = useState<GoalFormState>(() => getInitialGoalForm(goal));
  const [savingGoal, setSavingGoal] = useState(false);
  const [applyingGoal, setApplyingGoal] = useState(false);
  const [removingGoal, setRemovingGoal] = useState(false);

  useEffect(() => {
    setForm(getInitialGoalForm(goal));
    setIsEditingGoal(!goal);
  }, [goal]);

  if (!data) return null;

  const { category, allocation, previousAllocation } = data;
  const assigned = allocation?.assigned_cents ?? 0;
  const activity = allocation?.activity_cents ?? 0;
  const available = allocation?.available_cents ?? 0;
  const prevAvailable = allocation?.prev_available_cents ?? previousAllocation?.available_cents ?? 0;
  const prevAssigned = previousAllocation?.assigned_cents ?? 0;
  const prevActivity = previousAllocation?.activity_cents ?? 0;
  const emoji = category.icon ?? "🏷️";
  const projection = goal && allocation ? calcularProjecaoMeta(goal, allocation, month) : null;
  const monthLabel = formatMonthLabel(month);
  const previousMonthKey = shiftMonth(month, -1);
  const previousMonthLabel = formatMonthLabel(previousMonthKey);

  const amountCents = normalizarValorMonetario(form.amountInput);
  const recommendedAssign = projection ? Math.max(projection.falta, projection.necessarioNoMes) : 0;

  const handleAssign = () => {
    const input = window.prompt("Atribuir valor", fmtBRL(assigned));
    if (!input) return;
    const cents = normalizarValorMonetario(input);
    onAssign(cents);
  };

  const handleMoveMoney = () => {
    const input = window.prompt("Mover para pronto para atribuir", fmtBRL(0));
    if (!input) return;
    const cents = normalizarValorMonetario(input);
    if (cents <= 0) return;
    onMove(cents);
  };

  const handleSubmitGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = normalizarValorMonetario(form.amountInput);
    if (value <= 0) {
      window.alert("Informe um valor maior que zero para a meta.");
      return;
    }
    if (form.type === "TBD" && !form.targetMonth) {
      window.alert("Defina um mês-alvo para esta meta.");
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
      setIsEditingGoal(false);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleApplyGoal = async () => {
    if (!projection || recommendedAssign <= 0) return;
    setApplyingGoal(true);
    try {
      await onApplyGoal();
    } finally {
      setApplyingGoal(false);
    }
  };

  const handleRemoveGoal = async () => {
    if (!goal) return;
    const confirmed = window.confirm("Remover meta desta categoria?");
    if (!confirmed) return;
    setRemovingGoal(true);
    try {
      await onRemoveGoal();
      setIsEditingGoal(true);
    } finally {
      setRemovingGoal(false);
    }
  };

  return (
    <div className="inspector__content">
      <header className="inspector__header">
        <div>
          <div className="inspector__title">
            <span aria-hidden>{emoji}</span>
            <span>{category.name}</span>
          </div>
          <p className="inspector__subtitle">{category.group_name}</p>
        </div>
        <div className="inspector__header-actions">
          <button type="button" className="btn-link" onClick={onClose}>
            Limpar seleção
          </button>
          <button
            type="button"
            className="inspector__icon-button"
            aria-label="Mais ações"
            onClick={onRename}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </header>

      <section className="card inspector-card">
        <div className="inspector-balance__header">
          <div>
            <h3 className="inspector-card__title">Saldo disponível</h3>
            <p className="inspector-card__meta">Inclui {fmtBRL(prevAvailable)} de {previousMonthLabel}</p>
          </div>
          <p className={`inspector-balance__value ${available < 0 ? "inspector-balance__value--negative" : ""}`}>
            {fmtBRL(available)}
          </p>
        </div>

        <dl className="inspector-balance__grid">
          <div>
            <dt>Atribuído em {monthLabel}</dt>
            <dd>{fmtBRL(assigned)}</dd>
          </div>
          <div>
            <dt>Atividade em {monthLabel}</dt>
            <dd>{fmtBRL(activity)}</dd>
          </div>
          <div>
            <dt>Disponível vindo de {previousMonthLabel}</dt>
            <dd>{fmtBRL(prevAvailable)}</dd>
          </div>
          <div>
            <dt>Atribuído em {previousMonthLabel}</dt>
            <dd>{fmtBRL(prevAssigned)}</dd>
          </div>
          <div>
            <dt>Atividade em {previousMonthLabel}</dt>
            <dd>{fmtBRL(prevActivity)}</dd>
          </div>
        </dl>

        <div className="inspector-balance__actions">
          <button type="button" className="btn-primary" onClick={handleAssign}>
            Atribuir
          </button>
          <button type="button" className="btn-link" onClick={handleMoveMoney}>
            Mover dinheiro
          </button>
          <button type="button" className="btn-link" onClick={onReset}>
            Zerar categoria
          </button>
        </div>
      </section>

      <section className="card inspector-card">
        <header className="inspector-target__header">
          <h3 className="inspector-card__title">Meta da categoria</h3>
          {goal && !isEditingGoal ? (
            <button type="button" className="btn-link" onClick={() => setIsEditingGoal(true)}>
              Editar meta
            </button>
          ) : null}
        </header>

        {isEditingGoal ? (
          <form className="inspector-target__form" onSubmit={handleSubmitGoal}>
            <div className="inspector-target__tabs" role="tablist">
              {GOAL_FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.cadence}
                  type="button"
                  role="tab"
                  className={`inspector-target__tab ${form.cadence === option.cadence ? "inspector-target__tab--active" : ""}`}
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

            <label className="inspector-target__field">
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
              />
            </label>

            {form.type === "TBD" ? (
              <label className="inspector-target__field">
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
                />
              </label>
            ) : null}

            <div className="inspector-target__actions">
              <button type="button" className="btn-link" onClick={() => setIsEditingGoal(false)}>
                Cancelar
              </button>
              {goal ? (
                <button
                  type="button"
                  className="btn-link inspector-target__remove"
                  onClick={handleRemoveGoal}
                  disabled={removingGoal}
                >
                  {removingGoal ? "Removendo…" : "Remover meta"}
                </button>
              ) : null}
              <button type="submit" className="btn-primary" disabled={savingGoal}>
                {savingGoal ? "Salvando…" : "Salvar meta"}
              </button>
            </div>
          </form>
        ) : goal ? (
          <div className="inspector-target__summary">
            <div className="inspector-target__summary-head">
              <div>
                <p className="inspector-target__summary-type">{GOAL_TYPE_LABELS[goal.type]}</p>
                <p className="inspector-target__summary-desc">{goalDescription(goal)}</p>
              </div>
              <p className="inspector-target__summary-amount">{fmtBRL(goal.amount_cents)}</p>
            </div>

            {projection ? (
              <>
                <div className="inspector-target__progress">
                  <div className="inspector-target__progress-bar" aria-hidden>
                    <span
                      style={{ width: `${Math.min(100, Math.round((projection.progresso ?? 0) * 100))}%` }}
                    />
                  </div>
                  <p className="inspector-target__progress-caption">
                    Falta {fmtBRL(projection.falta)} para atingir {fmtBRL(projection.alvo)}.
                  </p>
                </div>
                {recommendedAssign > 0 ? (
                  <button
                    type="button"
                    className="btn-primary inspector-target__apply"
                    onClick={handleApplyGoal}
                    disabled={applyingGoal}
                  >
                    {applyingGoal
                      ? "Aplicando…"
                      : `Atribuir ${fmtBRL(recommendedAssign)}`}
                  </button>
                ) : null}
                <dl className="inspector-target__grid">
                  <div>
                    <dt>Necessário este mês</dt>
                    <dd>{fmtBRL(projection.necessarioNoMes)}</dd>
                  </div>
                  <div>
                    <dt>Já atribuído</dt>
                    <dd>{fmtBRL(projection.atribuido)}</dd>
                  </div>
                  <div>
                    <dt>Saldo disponível</dt>
                    <dd>{fmtBRL(allocation?.available_cents ?? 0)}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="inspector-target__summary-empty">Nenhuma projeção disponível para esta meta.</p>
            )}

            <button
              type="button"
              className="btn-link inspector-target__remove"
              onClick={handleRemoveGoal}
              disabled={removingGoal}
            >
              {removingGoal ? "Removendo…" : "Remover meta"}
            </button>
          </div>
        ) : (
          <div className="inspector-target__empty">
            <p>Defina um alvo para manter essa categoria sob controle.</p>
            <button type="button" className="btn-primary" onClick={() => setIsEditingGoal(true)}>
              Criar meta
            </button>
          </div>
        )}
      </section>

      <section className="card inspector-card">
        <h3 className="inspector-card__title">Organizar categoria</h3>
        <div className="inspector-actions__grid">
          <button type="button" className="btn-link" onClick={onRename}>
            Renomear categoria
          </button>
          <button type="button" className="btn-link" onClick={onArchive}>
            Arquivar categoria
          </button>
        </div>
      </section>
    </div>
  );
}

function InspectorPanel({
  selected,
  month,
  readyToAssign,
  totals,
  onClose,
  onAssign,
  onMove,
  onReset,
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
          onAssign={onAssign}
          onMove={onMove}
          onReset={onReset}
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

function AddCategoryModal({ state, onClose, onSubmit, groups }: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<string>(groups[0] ?? "");
  useEffect(() => {
    if (state.open) {
      setName("");
      if (state.groupId && groups.includes(state.groupId)) {
        setGroup(state.groupId);
      } else if (groups[0]) {
        setGroup(groups[0]);
      }
    }
  }, [state.open, state.groupId, groups]);

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

  const didInitRef = useRef(false);
  const syncingUrlRef = useRef(false);
  const initialMonthRef = useRef<string | null>(null);

  useEffect(() => {
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
      if (window.location.pathname !== desiredPath) {
        syncingUrlRef.current = true;
        router.replace(desiredPath, { scroll: false });
        queueMicrotask(() => {
          syncingUrlRef.current = false;
        });
      }
    }
  }, [initializeMonth, params?.slug, router]);

  useEffect(() => {
    if (!monthSelected) return;
    if (syncingUrlRef.current) return;

    const desiredPath = `/budgets/${monthSelected}`;
    if (typeof window !== "undefined" && window.location.pathname !== desiredPath) {
      syncingUrlRef.current = true;
      router.replace(desiredPath, { scroll: false });
      queueMicrotask(() => {
        syncingUrlRef.current = false;
      });
    }
  }, [monthSelected, router]);

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
          onUndo={desfazer}
          onRedo={refazer}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
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
            onAssign={(value) => {
              if (!selectedData) return;
              void handleAssign(selectedData.category.id, value);
            }}
            onMove={(amount) => {
              if (!selectedData) return;
              const currentAssigned = selectedData.allocation?.assigned_cents ?? 0;
              const nextValue = Math.max(currentAssigned - amount, 0);
              void handleAssign(selectedData.category.id, nextValue);
            }}
            onReset={() => {
              if (!selectedData) return;
              void handleAssign(selectedData.category.id, 0);
            }}
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
