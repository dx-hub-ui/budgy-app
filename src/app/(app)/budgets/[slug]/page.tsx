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
import { ChevronDown, ChevronRight, X } from "lucide-react";

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
import { HiddenCategoriesModal } from "@/components/orcamento/HiddenCategoriesModal";
import { CategoryNameModal } from "@/components/orcamento/CategoryNameModal";
import { CategoryDetailsPanel } from "@/components/budget/CategoryDetailsPanel";
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

type InspectorPanelProps = {
  selected: CategoryWithData | null;
  month: string;
  readyToAssign: number;
  totals: { assigned: number; activity: number; available: number };
  onClose: () => void;
  onAssign: (value: number) => void;
  onArchive: () => void;
  onRename: () => void;
  onSaveGoal: (payload: {
    type: BudgetGoal["type"];
    amount_cents: number;
    target_month?: string | null;
    cadence?: BudgetGoal["cadence"];
    due_day_of_month?: number | null;
  }) => Promise<void> | void;
  onApplyGoal: () => Promise<void> | void;
  onRemoveGoal: () => Promise<void> | void;
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
          className="flex items-center gap-1 text-left text-sm font-medium"
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
          <div className="relative pb-1">
            <button
              type="button"
              className="inline-flex w-full max-w-full truncate text-left text-sm font-medium text-[var(--cc-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              onClick={(event) => {
                event.stopPropagation();
                onRename();
              }}
            >
              <span className="truncate">{category.name}</span>
            </button>
            {renderProgress({ allocation, goal })}
          </div>
        </div>
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
            className="w-full min-w-[7rem] rounded-lg border border-[var(--ring)] bg-white px-2 py-1 text-right text-sm font-medium text-[var(--cc-text)] shadow-sm focus:outline-none"
            inputMode="numeric"
            aria-label={`Editar atribuição de ${category.name}`}
          />
        ) : (
          <button
            type="button"
            className="min-w-[7rem] rounded-lg border border-transparent px-2 py-1 text-right text-sm font-medium text-[var(--cc-text)] transition hover:border-[var(--cc-border)] hover:bg-[var(--tbl-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
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
          className="min-w-[6.5rem] rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-[var(--cc-border)] hover:bg-[var(--tbl-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
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
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[var(--cc-text-muted)]">{title}</p>
      <p className="mt-1 text-xl font-medium text-[var(--cc-text)]">{value}</p>
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
            <h2 className="text-lg font-medium text-[var(--cc-text)]">Atividades da categoria</h2>
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
                const dateLabel = item.occurred_on
                  ? activityDateFormatter.format(new Date(`${item.occurred_on}T00:00:00`))
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
                        <p className="text-sm font-medium text-[var(--cc-text)]">
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
                      <span className={`text-sm font-medium ${tone}`}>{fmtBRL(signed)}</span>
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
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.32em] text-[var(--cc-text-muted)]">Resumo do mês</p>
        <h2 className="mt-2 text-xl font-medium leading-tight text-[var(--cc-text)]">{monthLabel}</h2>
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

function InspectorPanel({
  selected,
  month,
  readyToAssign,
  totals,
  onClose,
  onAssign,
  onArchive,
  onRename,
  onSaveGoal,
  onApplyGoal,
  onRemoveGoal
}: InspectorPanelProps) {
  return (
    <aside className="inspector" aria-label="Painel do orçamento">
      {selected ? (
        <CategoryDetailsPanel
          category={selected.category}
          allocation={selected.allocation}
          previousAllocation={selected.previousAllocation}
          goal={selected.goal}
          month={month}
          onClose={onClose}
          onAssign={onAssign}
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
          <h2 className="text-lg font-medium text-[var(--cc-text)]">Adicionar categoria</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-[var(--cc-text-muted)] hover:bg-[var(--tbl-row-hover)]">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--cc-text)]">
            Nome
            <input
              required
              className="mt-1 w-full rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ring)] focus:outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--cc-text)]">
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
  const salvarNome = useBudgetPlannerStore((s) => s.salvarNome);
  const ocultarCategoria = useBudgetPlannerStore((s) => s.ocultarCategoria);
  const mostrarCategoria = useBudgetPlannerStore((s) => s.mostrarCategoria);
  const excluirCategoria = useBudgetPlannerStore((s) => s.excluirCategoria);
  const editarAtribuido = useBudgetPlannerStore((s) => s.editarAtribuido);
  const distribuirAutomaticamente = useBudgetPlannerStore((s) => s.distribuirAutomaticamente);
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
  const hiddenCategories = budgetPlannerSelectors.useHiddenCategories();
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
  const [hiddenModalOpen, setHiddenModalOpen] = useState(false);
  const [unhidingId, setUnhidingId] = useState<string | null>(null);
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

  const isBudgetMonthRoute = useMemo(() => {
    if (!pathname) return false;
    if (!pathname.startsWith("/budgets/")) return false;
    return !pathname.startsWith("/budgets/report");
  }, [pathname]);

  useEffect(() => {
    if (!isBudgetMonthRoute) return;
    if (didInitRef.current) return;
    didInitRef.current = true;

    const slugMonth = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;
    let queryMonth: string | null = null;
    if (typeof window !== "undefined") {
      queryMonth = new URLSearchParams(window.location.search).get("m");
    }
    const initial = (queryMonth ?? slugMonth ?? mesAtual()).slice(0, 7);
    void initializeMonth(initial);

    if (typeof window !== "undefined" && queryMonth) {
      const desiredPath = `/budgets/${initial}`;
      if (isBudgetMonthRoute && pathname !== desiredPath) {
        router.replace(desiredPath, { scroll: false });
      }
    }
  }, [initializeMonth, isBudgetMonthRoute, params?.slug, pathname, router]);

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
    if (hiddenModalOpen && hiddenCategories.length === 0) {
      setHiddenModalOpen(false);
    }
  }, [hiddenModalOpen, hiddenCategories.length]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const paramId = params.get("cat");
    setSelectedId(paramId);
  }, [searchParamsString]);

  const goToMonth = useCallback(
    async (nextMonth: string) => {
      const normalized = nextMonth.slice(0, 7);
      if (isBudgetMonthRoute) {
        const desiredPath = `/budgets/${normalized}`;
        if (pathname !== desiredPath) {
          router.replace(desiredPath, { scroll: false });
        }
      }
      await selecionarMes(normalized);
    },
    [isBudgetMonthRoute, pathname, router, selecionarMes]
  );

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (!isBudgetMonthRoute) {
        return;
      }
      const paramsObj = new URLSearchParams(searchParamsString);
      if (!id) paramsObj.delete("cat");
      else paramsObj.set("cat", id);
      const query = paramsObj.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [isBudgetMonthRoute, pathname, router, searchParamsString]
  );

  const closeSelection = useCallback(() => {
    select(null);
  }, [select]);

  const handleUnhideCategory = useCallback(
    async (categoryId: string) => {
      setUnhidingId(categoryId);
      try {
        await mostrarCategoria(categoryId);
      } finally {
        setUnhidingId((current) => (current === categoryId ? null : current));
      }
    },
    [mostrarCategoria]
  );

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
        await distribuirAutomaticamente(assignments);
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
    [definirToast, distribuirAutomaticamente]
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
            void goToMonth(shiftMonth(currentMonth, -1));
          }}
          onGoNext={() => {
            if (!currentMonth) return;
            void goToMonth(shiftMonth(currentMonth, 1));
          }}
          onAddCategory={() => setAddCategory({ open: true, groupId: groups[0]?.name ?? null })}
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
            <div className="tbl-head row tabular">
              <div className="cell">CATEGORIA</div>
              <div className="cell justify-end">ATRIBUÍDO</div>
              <div className="cell justify-end">ATIVIDADE</div>
              <div className="cell justify-end">DISPONÍVEL</div>
            </div>

            <div className="budget-categories-scroll">
              {loading ? (
                <div className="mt-6 rounded-lg border border-[var(--tbl-border)] bg-white px-4 py-8 text-center text-sm text-[var(--cc-text-muted)]">
                  Carregando orçamento…
                </div>
              ) : (
                <>
                  {groupsWithAllocations.map((group) => (
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
                  ))}
                  {hiddenCategories.length > 0 ? (
                    <div className="mt-6 rounded-2xl border border-[var(--tbl-border)] bg-white p-4 shadow-sm">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 text-left"
                        onClick={() => setHiddenModalOpen(true)}
                      >
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--cc-text)]">
                            Categorias Ocultas
                          </p>
                          <p className="mt-1 text-xs text-[var(--cc-text-muted)]">
                            {hiddenCategories.length === 1
                              ? "1 categoria oculta"
                              : `${hiddenCategories.length} categorias ocultas`}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-[var(--cc-text-muted)]" aria-hidden />
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {hiddenCategories.slice(0, 3).map((category) => (
                          <span
                            key={category.id}
                            className="rounded-full bg-[var(--cc-bg-elev)] px-3 py-1 text-xs font-medium text-[var(--cc-text-muted)]"
                          >
                            {category.name}
                          </span>
                        ))}
                        {hiddenCategories.length > 3 ? (
                          <span className="rounded-full bg-[var(--cc-bg-elev)] px-3 py-1 text-xs font-medium text-[var(--cc-text-muted)]">
                            +{hiddenCategories.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
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

      <HiddenCategoriesModal
        open={hiddenModalOpen}
        categories={hiddenCategories}
        onClose={() => {
          if (unhidingId) return;
          setHiddenModalOpen(false);
        }}
        onUnhide={(categoryId) => {
          void handleUnhideCategory(categoryId);
        }}
        processingId={unhidingId}
      />

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
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
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
