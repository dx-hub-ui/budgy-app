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
      className="row tabular"
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
        <button
          type="button"
          className="flex-1 truncate text-left text-sm font-medium text-[var(--cc-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          onClick={(event) => {
            event.stopPropagation();
            onRename();
          }}
        >
          {category.name}
        </button>
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

function CategoryInspector({ data, month, onClose, onAssign, onMove, onReset, onArchive, onRename }: CategoryInspectorProps) {
  if (!data) return null;
  const { category, allocation, goal } = data;
  const assigned = allocation?.assigned_cents ?? 0;
  const activity = allocation?.activity_cents ?? 0;
  const available = allocation?.available_cents ?? 0;
  const target = goal?.amount_cents ?? 0;
  const emoji = category.icon ?? "🏷️";
  const projection = goal && allocation ? calcularProjecaoMeta(goal, allocation, month) : null;

  return (
    <div>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-[var(--cc-text)]">
            <span aria-hidden>{emoji}</span>
            <span>{category.name}</span>
          </div>
          <p className="text-xs text-[var(--cc-text-muted)]">{category.group_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-link" onClick={onClose}>
            Limpar seleção
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-[var(--cc-text-muted)] hover:bg-[var(--tbl-row-hover)]"
            aria-label="Renomear categoria"
            onClick={onRename}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </header>

      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="card">
          <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-muted)]">Disponível</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--cc-text)]">{fmtBRL(available)}</dd>
        </div>
        <div className="card">
          <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-muted)]">Atribuído</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--cc-text)]">{fmtBRL(assigned)}</dd>
        </div>
        <div className="card">
          <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-muted)]">Atividade</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--cc-text)]">{fmtBRL(activity)}</dd>
        </div>
        <div className="card">
          <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-muted)]">Meta</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--cc-text)]">{fmtBRL(target)}</dd>
        </div>
      </dl>

      <section className="card">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--cc-text)]">Meta da categoria</h3>
          <button
            type="button"
            className="rounded-md border border-[var(--cc-border)] px-2 py-1 text-xs font-semibold text-[var(--cc-text)] hover:bg-[var(--tbl-row-hover)]"
            onClick={() => {
              const input = window.prompt("Nova meta", fmtBRL(target));
              if (!input) return;
              const cents = normalizarValorMonetario(input);
              onAssign(cents);
            }}
          >
            Ajustar atribuição
          </button>
        </header>
        {projection ? (
          <p className="text-xs text-[var(--cc-text-muted)]">Necessário este mês: {fmtBRL(projection.necessarioNoMes)}</p>
        ) : (
          <p className="text-xs text-[var(--cc-text-muted)]">Nenhuma meta definida.</p>
        )}
      </section>

      <section className="card">
        <h3 className="text-sm font-semibold text-[var(--cc-text)]">Transações recentes</h3>
        <p className="mt-2 text-xs text-[var(--cc-text-muted)]">Nenhuma transação encontrada para este mês.</p>
      </section>

      <section className="card">
        <h3 className="mb-3 text-sm font-semibold text-[var(--cc-text)]">Ações rápidas</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              const input = window.prompt("Atribuir valor", fmtBRL(assigned));
              if (!input) return;
              const cents = normalizarValorMonetario(input);
              onAssign(cents);
            }}
          >
            Atribuir
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              const input = window.prompt(
                "Mover para pronto para atribuir",
                fmtBRL(0)
              );
              if (!input) return;
              const cents = normalizarValorMonetario(input);
              if (cents <= 0) return;
              onMove(cents);
            }}
          >
            Mover
          </button>
          <button type="button" className="btn-link" onClick={onReset}>
            Zerar
          </button>
          <button type="button" className="btn-link" onClick={onArchive}>
            Arquivar
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
  onRename
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

  const initializeMonth = useBudgetPlannerStore((s) => s.initializeMonth);
  const selecionarMes = useBudgetPlannerStore((s) => s.selecionarMes);
  const abrirModalNome = useBudgetPlannerStore((s) => s.abrirModalNome);
  const fecharOverlays = useBudgetPlannerStore((s) => s.fecharOverlays);
  const alternarOcultas = useBudgetPlannerStore((s) => s.alternarOcultas);
  const salvarNome = useBudgetPlannerStore((s) => s.salvarNome);
  const ocultarCategoria = useBudgetPlannerStore((s) => s.ocultarCategoria);
  const excluirCategoria = useBudgetPlannerStore((s) => s.excluirCategoria);
  const editarAtribuido = useBudgetPlannerStore((s) => s.editarAtribuido);
  const desfazer = useBudgetPlannerStore((s) => s.desfazer);
  const refazer = useBudgetPlannerStore((s) => s.refazer);
  const definirToast = useBudgetPlannerStore((s) => s.definirToast);
  const criarCategoria = useBudgetPlannerStore((s) => s.criarCategoria);

  const ui = budgetPlannerSelectors.useUI();
  const categories = budgetPlannerSelectors.useCategories();
  const groups = budgetPlannerSelectors.useGroups();
  const monthSelected = budgetPlannerSelectors.useMonth();
  const currentMonth = monthSelected ?? mesAtual();
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

  const selectedId = searchParams?.get("cat") ?? null;

  const select = useCallback(
    (id: string | null) => {
      const paramsObj = new URLSearchParams(searchParams?.toString() ?? "");
      if (!id) paramsObj.delete("cat");
      else paramsObj.set("cat", id);
      const query = paramsObj.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams]
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
    return {
      category,
      allocation: allocations[category.id]?.[currentMonth],
      goal: goals[category.id]
    };
  }, [allocations, categories, currentMonth, goals, selectedId]);

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
