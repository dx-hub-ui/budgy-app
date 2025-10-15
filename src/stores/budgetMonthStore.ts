import { create } from "zustand";

import {
  BudgetAllocationView,
  BudgetMonthEnvelope,
  BudgetMonthSummary,
  calculateToBeBudgeted,
  computeAvailable,
  NULL_CATEGORY_KEY
} from "@/domain/budget";

export type QuickBudgetMode =
  | "UNDERFUNDED"
  | "BUDGETED_LAST_MONTH"
  | "SPENT_LAST_MONTH"
  | "AVERAGE_BUDGETED"
  | "AVERAGE_SPENT";

type BudgetSnapshot = {
  categories: BudgetAllocationView[];
  summary: BudgetMonthSummary;
};

type QuickBudgetContext = {
  previousBudgeted: Record<string, number>;
  previousActivity: Record<string, number>;
  averageBudgeted: Record<string, number>;
  averageActivity: Record<string, number>;
};

export type QuickBudgetDiff = {
  id: string;
  name: string;
  from: number;
  to: number;
  delta: number;
};

export type QuickBudgetResult = {
  diffs: QuickBudgetDiff[];
  description: string;
};

const MAX_HISTORY = 50;

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function cloneCategories(categories: BudgetAllocationView[]) {
  return categories.map((item) => ({ ...item }));
}

function cloneSummary(summary: BudgetMonthSummary): BudgetMonthSummary {
  return { ...summary };
}

function deriveSummary(
  summary: BudgetMonthSummary,
  categories: BudgetAllocationView[]
): BudgetMonthSummary {
  const inflows = summary.inflows_cents;
  const budgeted = categories.reduce((acc, item) => acc + item.budgeted_cents, 0);
  const toBeBudgeted = calculateToBeBudgeted(inflows, categories);
  return {
    ...summary,
    budgeted_in_month_cents: budgeted,
    to_be_budgeted_cents: toBeBudgeted
  };
}

function categoryKey(categoryId: string | null) {
  return categoryId ?? NULL_CATEGORY_KEY;
}

type BudgetHistory = {
  past: BudgetSnapshot[];
  present: BudgetSnapshot | null;
  future: BudgetSnapshot[];
};

const emptyHistory: BudgetHistory = {
  past: [],
  present: null,
  future: []
};

type BudgetMonthState = {
  monthKey: string | null;
  summary: BudgetMonthSummary | null;
  categories: BudgetAllocationView[];
  selection: string[];
  focusedId: string | null;
  saving: boolean;
  loading: boolean;
  error: string | null;
  lastAction: string | null;
  history: BudgetHistory;
  quickBudget: QuickBudgetContext;
  initialize: (payload: BudgetMonthEnvelope) => void;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
  setSaving: (value: boolean) => void;
  markSaved: (message: string) => void;
  setSummaryFunds: (value: number) => void;
  editBudget: (id: string, value: number) => void;
  applyPatch: (patch: Array<{ id: string; nextBudgeted: number }>, description: string) => QuickBudgetDiff[];
  batchSet: (ids: string[], value: number) => void;
  batchAdjust: (ids: string[], delta: number) => void;
  batchAdjustPercent: (ids: string[], percent: number) => void;
  toggleSelection: (id: string, multi?: boolean) => void;
  replaceSelection: (ids: string[]) => void;
  clearSelection: () => void;
  setFocused: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  applyQuickBudget: (mode: QuickBudgetMode) => QuickBudgetResult;
  previewQuickBudget: (mode: QuickBudgetMode) => QuickBudgetResult;
};

function captureSnapshot(state: BudgetMonthState): BudgetSnapshot | null {
  if (!state.summary) return null;
  return {
    categories: cloneCategories(state.categories),
    summary: cloneSummary(state.summary)
  };
}

function pushHistory(history: BudgetHistory, snapshot: BudgetSnapshot) {
  const nextPast = [...history.past, snapshot];
  if (nextPast.length > MAX_HISTORY) {
    nextPast.splice(0, nextPast.length - MAX_HISTORY);
  }
  return nextPast;
}

function applySnapshot(state: BudgetMonthState, snapshot: BudgetSnapshot) {
  state.categories = cloneCategories(snapshot.categories);
  state.summary = cloneSummary(snapshot.summary);
  state.history.present = snapshot;
}

function computeGoalTarget(allocation: BudgetAllocationView): number | null {
  const goal = allocation.goal;
  if (!goal) return null;
  const prev = allocation.prev_available_cents;
  const activity = allocation.activity_cents;
  if (goal.goal_type === "MFG") {
    return goal.amount_cents;
  }
  if (goal.goal_type === "TB" || goal.goal_type === "TBD") {
    return Math.max(goal.amount_cents + activity - prev, 0);
  }
  return null;
}

function buildQuickBudgetPatch(
  mode: QuickBudgetMode,
  state: BudgetMonthState
): { description: string; patch: Array<{ id: string; nextBudgeted: number }>; diffs: QuickBudgetDiff[] } {
  const selection = state.selection.length > 0 ? new Set(state.selection) : null;
  const patch: Array<{ id: string; nextBudgeted: number }> = [];
  const diffs: QuickBudgetDiff[] = [];
  const context = state.quickBudget;
  let description = "";

  for (const allocation of state.categories) {
    if (selection && !selection.has(allocation.id)) continue;
    const key = categoryKey(allocation.category_id);
    let target: number | null = null;
    switch (mode) {
      case "UNDERFUNDED": {
        target = computeGoalTarget(allocation);
        description = "Preencher metas";
        if (target !== null) {
          target = Math.max(target, 0);
        }
        break;
      }
      case "BUDGETED_LAST_MONTH": {
        target = context.previousBudgeted[key] ?? null;
        description = "Orçado no mês anterior";
        break;
      }
      case "SPENT_LAST_MONTH": {
        target = context.previousActivity[key] ?? null;
        description = "Gasto no mês anterior";
        break;
      }
      case "AVERAGE_BUDGETED": {
        target = context.averageBudgeted[key] ?? null;
        description = "Média orçada";
        break;
      }
      case "AVERAGE_SPENT": {
        target = context.averageActivity[key] ?? null;
        description = "Média gasta";
        break;
      }
      default:
        target = null;
    }
    if (target === null || target === undefined) continue;
    const sanitizedTarget = Math.round(target);
    if (sanitizedTarget === allocation.budgeted_cents) continue;
    patch.push({ id: allocation.id, nextBudgeted: sanitizedTarget });
    diffs.push({
      id: allocation.id,
      name: allocation.name,
      from: allocation.budgeted_cents,
      to: sanitizedTarget,
      delta: sanitizedTarget - allocation.budgeted_cents
    });
  }

  if (!description) {
    switch (mode) {
      case "UNDERFUNDED":
        description = "Preencher metas";
        break;
      case "BUDGETED_LAST_MONTH":
        description = "Orçado no mês anterior";
        break;
      case "SPENT_LAST_MONTH":
        description = "Gasto no mês anterior";
        break;
      case "AVERAGE_BUDGETED":
        description = "Média orçada";
        break;
      case "AVERAGE_SPENT":
        description = "Média gasta";
        break;
      default:
        description = "Ajuste rápido";
    }
  }

  return { description, patch, diffs };
}

export const useBudgetMonthStore = create<BudgetMonthState>()((set, get) => ({
  monthKey: null,
  summary: null,
  categories: [],
  selection: [],
  focusedId: null,
  saving: false,
  loading: false,
  error: null,
  lastAction: null,
  history: emptyHistory,
  quickBudget: {
    previousBudgeted: {},
    previousActivity: {},
    averageBudgeted: {},
    averageActivity: {}
  },
  initialize: (payload) => {
    const summary = deriveSummary(payload.summary, payload.categories);
    set(() => ({
      monthKey: formatMonthKey(payload.summary.year, payload.summary.month),
      summary,
      categories: cloneCategories(payload.categories),
      selection: [],
      focusedId: null,
      saving: false,
      loading: false,
      error: null,
      lastAction: null,
      history: {
        past: [],
        future: [],
        present: { categories: cloneCategories(payload.categories), summary: cloneSummary(summary) }
      },
      quickBudget: {
        previousBudgeted: { ...payload.previousBudgetedMap },
        previousActivity: { ...payload.previousActivityMap },
        averageBudgeted: { ...payload.averageBudgetedMap },
        averageActivity: { ...payload.averageActivityMap }
      }
    }));
  },
  setLoading: (value) => set({ loading: value }),
  setError: (message) => set({ error: message }),
  setSaving: (value) => set({ saving: value }),
  markSaved: (message) => set({ saving: false, lastAction: message }),
  setSummaryFunds: (value) =>
    set((state) => {
      if (!state.summary) return state;
      const summary = deriveSummary(
        {
          ...state.summary,
          inflows_cents: value,
          funds_for_month_cents: value
        },
        state.categories
      );
      const snapshot = captureSnapshot(state);
      if (!snapshot) return { ...state, summary };
      const updatedSnapshot: BudgetSnapshot = {
        categories: cloneCategories(state.categories),
        summary: cloneSummary(summary)
      };
      return {
        ...state,
        summary,
        history: {
          past: pushHistory(state.history, snapshot),
          future: [],
          present: updatedSnapshot
        },
        lastAction: "Atualizado saldo a orçar"
      };
    }),
  editBudget: (id, value) =>
    set((state) => {
      if (!state.summary) return state;
      const snapshot = captureSnapshot(state);
      const categories = state.categories.map((item) => {
        if (item.id !== id) return item;
        if (item.budgeted_cents === value) return item;
        const available = computeAvailable(item.prev_available_cents, value, item.activity_cents);
        return { ...item, budgeted_cents: value, available_cents: available };
      });
      if (!snapshot) {
        return {
          ...state,
          categories,
          summary: deriveSummary(state.summary, categories)
        };
      }
      const summary = deriveSummary(state.summary, categories);
      const presentSnapshot: BudgetSnapshot = {
        categories: cloneCategories(categories),
        summary: cloneSummary(summary)
      };
      return {
        ...state,
        categories,
        summary,
        history: {
          past: snapshot ? pushHistory(state.history, snapshot) : state.history.past,
          future: [],
          present: presentSnapshot
        },
        lastAction: "Valor de categoria ajustado"
      };
    }),
  applyPatch: (patch, description) => {
    if (patch.length === 0) return [];
    const state = get();
    const snapshot = captureSnapshot(state);
    const patchMap = new Map(patch.map((item) => [item.id, item.nextBudgeted]));
    const categories = state.categories.map((item) => {
      const next = patchMap.get(item.id);
      if (next === undefined) return item;
      const available = computeAvailable(item.prev_available_cents, next, item.activity_cents);
      return { ...item, budgeted_cents: next, available_cents: available };
    });
    const currentSummary = state.summary;
    const summary = currentSummary ? deriveSummary(currentSummary, categories) : null;
    const diffs: QuickBudgetDiff[] = state.categories
      .filter((item) => patchMap.has(item.id))
      .map((item) => {
        const next = patchMap.get(item.id)!;
        return {
          id: item.id,
          name: item.name,
          from: item.budgeted_cents,
          to: next,
          delta: next - item.budgeted_cents
        };
      });
    set({
      categories,
      summary: summary ?? currentSummary,
      history:
        snapshot && summary
          ? {
              past: pushHistory(state.history, snapshot),
              future: [],
              present: {
                categories: cloneCategories(categories),
                summary: cloneSummary(summary)
              }
            }
          : state.history,
      lastAction: description
    });
    return diffs;
  },
  batchSet: (ids, value) => {
    if (ids.length === 0) return;
    const selection = ids.map((id) => ({ id, nextBudgeted: value }));
    get().applyPatch(selection, "Aplicação em lote");
  },
  batchAdjust: (ids, delta) => {
    if (ids.length === 0) return;
    const state = get();
    const patch = ids.map((id) => {
      const item = state.categories.find((cat) => cat.id === id);
      const next = item ? item.budgeted_cents + delta : delta;
      return { id, nextBudgeted: next };
    });
    get().applyPatch(patch, "Ajuste incremental");
  },
  batchAdjustPercent: (ids, percent) => {
    if (ids.length === 0) return;
    const state = get();
    const patch = ids.map((id) => {
      const item = state.categories.find((cat) => cat.id === id);
      const next = item ? Math.round(item.budgeted_cents * (1 + percent / 100)) : 0;
      return { id, nextBudgeted: next };
    });
    get().applyPatch(patch, "Ajuste percentual");
  },
  toggleSelection: (id, multi = false) =>
    set((state) => {
      if (multi) {
        const setSelection = new Set(state.selection);
        if (setSelection.has(id)) {
          setSelection.delete(id);
        } else {
          setSelection.add(id);
        }
        return { ...state, selection: Array.from(setSelection) };
      }
      return {
        ...state,
        selection: state.selection.includes(id) ? [] : [id]
      };
    }),
  replaceSelection: (ids) => set({ selection: [...ids] }),
  clearSelection: () => set({ selection: [] }),
  setFocused: (id) => set({ focusedId: id }),
  undo: () =>
    set((state) => {
      if (!state.history.present || state.history.past.length === 0) return state;
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);
      const future = [state.history.present, ...state.history.future].slice(0, MAX_HISTORY);
      return {
        ...state,
        categories: cloneCategories(previous.categories),
        summary: cloneSummary(previous.summary),
        history: { past: newPast, future, present: previous },
        lastAction: "Ação desfeita"
      };
    }),
  redo: () =>
    set((state) => {
      if (!state.history.present || state.history.future.length === 0) return state;
      const [next, ...rest] = state.history.future;
      const past = [...state.history.past, state.history.present].slice(-MAX_HISTORY);
      return {
        ...state,
        categories: cloneCategories(next.categories),
        summary: cloneSummary(next.summary),
        history: { past, future: rest, present: next },
        lastAction: "Ação refeita"
      };
    }),
  applyQuickBudget: (mode) => {
    const { description, patch, diffs } = buildQuickBudgetPatch(mode, get());
    if (patch.length === 0) {
      return { description, diffs: [] };
    }
    get().applyPatch(patch, description);
    return { description, diffs };
  },
  previewQuickBudget: (mode) => {
    const { description, diffs } = buildQuickBudgetPatch(mode, get());
    return { description, diffs };
  }
}));

export const budgetSelectors = {
  useSummary: () =>
    useBudgetMonthStore((state) => state.summary ?? undefined),
  useCategories: () =>
    useBudgetMonthStore((state) => state.categories),
  useSelection: () =>
    useBudgetMonthStore((state) => state.selection),
  useFocusedId: () =>
    useBudgetMonthStore((state) => state.focusedId),
  useLoading: () =>
    useBudgetMonthStore((state) => state.loading),
  useSaving: () =>
    useBudgetMonthStore((state) => state.saving),
  useLastAction: () =>
    useBudgetMonthStore((state) => state.lastAction),
  useCanUndo: () =>
    useBudgetMonthStore((state) => state.history.past.length > 0),
  useCanRedo: () =>
    useBudgetMonthStore((state) => state.history.future.length > 0)
};
