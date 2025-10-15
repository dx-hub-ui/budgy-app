import { Draft, produce } from "immer";
import { create } from "zustand";

import {
  aplicarMeta,
  agruparCategorias,
  carregarSnapshotOrcamento,
  calcularAAtribuir,
  calcularDisponivel,
  calcularProjecaoMeta,
  editarAtribuicao,
  excluirCategoria as apiExcluirCategoria,
  mesAtual,
  normalizarValorMonetario,
  ocultarCategoria as apiOcultarCategoria,
  removerMeta as apiRemoverMeta,
  salvarMeta as apiSalvarMeta,
  salvarNomeCategoria as apiSalvarNomeCategoria,
  type BudgetAllocation,
  type BudgetCategory,
  type BudgetGoal,
  type BudgetSnapshot,
} from "@/domain/budgeting";

type WizardStep = 1 | 2 | 3;

type UIState = {
  nameModalId: string | null;
  drawerCategoryId: string | null;
  wizardStep: WizardStep;
  showHidden: boolean;
};

type CategoriesState = {
  list: BudgetCategory[];
  loading: boolean;
};

type GoalsState = {
  byCategoryId: Record<string, BudgetGoal | undefined>;
};

type AllocationState = {
  byCategoryIdMonth: Record<string, Record<string, BudgetAllocation>>;
};

type Totals = {
  assigned: number;
  activity: number;
  available: number;
};

type ToastState = { type: "success" | "error" | "info"; message: string } | null;

type HistorySnapshot = {
  allocations: AllocationState["byCategoryIdMonth"];
  totalsByMonth: Record<string, Totals>;
  readyToAssignByMonth: Record<string, number>;
};

type HistoryState = {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
};

type BudgetPlannerState = {
  ui: UIState;
  month: { selected: string };
  categories: CategoriesState;
  goals: GoalsState;
  allocations: AllocationState;
  totalsByMonth: Record<string, Totals>;
  readyToAssignByMonth: Record<string, number>;
  inflowsByMonth: Record<string, number>;
  history: HistoryState;
  toast: ToastState;
  error: string | null;
  initializeMonth: (month: string) => Promise<void>;
  selecionarMes: (month: string) => Promise<void>;
  abrirModalNome: (id: string) => void;
  abrirDrawer: (id: string) => void;
  fecharOverlays: () => void;
  irParaPasso: (step: WizardStep) => void;
  alternarOcultas: () => void;
  salvarNome: (id: string, nome: string) => Promise<void>;
  ocultarCategoria: (id: string) => Promise<void>;
  excluirCategoria: (id: string) => Promise<void>;
  salvarMeta: (categoryId: string, payload: Partial<BudgetGoal>) => Promise<void>;
  removerMeta: (categoryId: string) => Promise<void>;
  aplicarMeta: (categoryId: string) => Promise<void>;
  editarAtribuido: (categoryId: string, valor: number) => Promise<void>;
  definirToast: (toast: ToastState) => void;
  desfazer: () => void;
  refazer: () => void;
};

const MAX_HISTORY = 50;

function cloneAllocations(source: AllocationState["byCategoryIdMonth"]) {
  return Object.fromEntries(
    Object.entries(source).map(([categoryId, months]) => [
      categoryId,
      Object.fromEntries(
        Object.entries(months).map(([month, allocation]) => [month, { ...allocation }]),
      ),
    ]),
  );
}

function cloneTotals(source: Record<string, Totals>) {
  return Object.fromEntries(
    Object.entries(source).map(([month, totals]) => [month, { ...totals }]),
  );
}

function captureHistory(state: BudgetPlannerState): HistorySnapshot {
  return {
    allocations: cloneAllocations(state.allocations.byCategoryIdMonth),
    totalsByMonth: cloneTotals(state.totalsByMonth),
    readyToAssignByMonth: { ...state.readyToAssignByMonth },
  };
}

function applyHistorySnapshot(
  set: (updater: (draft: BudgetPlannerState) => void) => void,
  snapshot: HistorySnapshot,
) {
  set(
    produce((draft: BudgetPlannerState) => {
      draft.allocations.byCategoryIdMonth = cloneAllocations(snapshot.allocations);
      draft.totalsByMonth = cloneTotals(snapshot.totalsByMonth);
      draft.readyToAssignByMonth = { ...snapshot.readyToAssignByMonth };
    }),
  );
}

async function persistSnapshot(month: string): Promise<BudgetSnapshot> {
  return carregarSnapshotOrcamento(month);
}

function toMonthKey(month: string) {
  return month.slice(0, 7);
}

function buildAllocationMap(snapshot: BudgetSnapshot) {
  const map: AllocationState["byCategoryIdMonth"] = {};
  snapshot.allocations.forEach((allocation) => {
    const key = toMonthKey(allocation.month);
    if (!map[allocation.category_id]) {
      map[allocation.category_id] = {};
    }
    map[allocation.category_id][key] = { ...allocation, month: key };
  });
  return map;
}

function updateAllocation(
  draft: BudgetPlannerState,
  categoryId: string,
  month: string,
  updater: (allocation: BudgetAllocation) => void,
) {
  if (!draft.allocations.byCategoryIdMonth[categoryId]) {
    draft.allocations.byCategoryIdMonth[categoryId] = {};
  }
  if (!draft.allocations.byCategoryIdMonth[categoryId][month]) {
    draft.allocations.byCategoryIdMonth[categoryId][month] = {
      category_id: categoryId,
      month,
      assigned_cents: 0,
      activity_cents: 0,
      available_cents: 0,
      prev_available_cents: 0,
    };
  }
  updater(draft.allocations.byCategoryIdMonth[categoryId][month]);
}

function updateNextMonthPrevAvailable(
  draft: BudgetPlannerState,
  categoryId: string,
  month: string,
  newAvailable: number,
) {
  const months = draft.allocations.byCategoryIdMonth[categoryId];
  if (!months) return;
  const orderedMonths = Object.keys(months).sort();
  const index = orderedMonths.indexOf(month);
  if (index >= 0 && index + 1 < orderedMonths.length) {
    const nextMonthKey = orderedMonths[index + 1];
    months[nextMonthKey] = {
      ...months[nextMonthKey],
      prev_available_cents: newAvailable,
    };
  }
}

export const useBudgetPlannerStore = create<BudgetPlannerState>((set, get) => {
  const setImmer = (updater: (draft: Draft<BudgetPlannerState>) => void) => {
    set(produce(updater));
  };

  return {
    ui: {
      nameModalId: null,
      drawerCategoryId: null,
      wizardStep: 1,
      showHidden: false,
    },
    month: { selected: mesAtual() },
    categories: { list: [], loading: false },
    goals: { byCategoryId: {} },
    allocations: { byCategoryIdMonth: {} },
    totalsByMonth: {},
    readyToAssignByMonth: {},
    inflowsByMonth: {},
    history: { past: [], future: [] },
    toast: null,
    error: null,
    async initializeMonth(month: string) {
      setImmer((draft) => {
        draft.categories.loading = true;
        draft.error = null;
      });
      try {
        const snapshot = await persistSnapshot(month);
        setImmer((draft) => {
          draft.month.selected = month;
          draft.categories.list = snapshot.categories;
          draft.categories.loading = false;
          draft.goals.byCategoryId = Object.fromEntries(
            snapshot.goals.map((goal) => [goal.category_id, goal]),
          );
          draft.allocations.byCategoryIdMonth = buildAllocationMap(snapshot);
          draft.totalsByMonth[month] = {
            assigned: snapshot.total_assigned_cents,
            activity: snapshot.total_activity_cents,
            available: snapshot.total_available_cents,
          };
          draft.readyToAssignByMonth[month] = snapshot.ready_to_assign_cents;
          draft.inflowsByMonth[month] = snapshot.inflows_cents;
          draft.history = { past: [], future: [] };
        });
      } catch (error: any) {
        setImmer((draft) => {
          draft.categories.loading = false;
          draft.error = error?.message ?? "Erro ao carregar orçamento";
        });
        throw error;
      }
    },
    async selecionarMes(month: string) {
      await get().initializeMonth(month);
    },
    abrirModalNome(id: string) {
      setImmer((draft) => {
        draft.ui.nameModalId = id;
        draft.ui.drawerCategoryId = null;
      });
    },
    abrirDrawer(id: string) {
      setImmer((draft) => {
        draft.ui.drawerCategoryId = id;
        draft.ui.nameModalId = null;
        draft.ui.wizardStep = 1;
      });
    },
    fecharOverlays() {
      setImmer((draft) => {
        draft.ui.nameModalId = null;
        draft.ui.drawerCategoryId = null;
      });
    },
    irParaPasso(step: WizardStep) {
      setImmer((draft) => {
        draft.ui.wizardStep = step;
      });
    },
    alternarOcultas() {
      setImmer((draft) => {
        draft.ui.showHidden = !draft.ui.showHidden;
      });
    },
    definirToast(toast: ToastState) {
      setImmer((draft) => {
        draft.toast = toast;
      });
    },
    async salvarNome(id: string, nome: string) {
      const trimmed = nome.trim();
      if (!trimmed) {
        throw new Error("Informe um nome válido");
      }
      const updated = await apiSalvarNomeCategoria(id, trimmed);
      setImmer((draft) => {
        draft.categories.list = draft.categories.list.map((cat) =>
          cat.id === id ? { ...cat, name: updated.name } : cat,
        );
        draft.toast = { type: "success", message: "Salvo com sucesso" };
        draft.ui.nameModalId = null;
      });
    },
    async ocultarCategoria(id: string) {
      const updated = await apiOcultarCategoria(id);
      setImmer((draft) => {
        draft.categories.list = draft.categories.list.map((cat) =>
          cat.id === id ? { ...cat, is_hidden: true } : cat,
        );
        draft.toast = { type: "info", message: "Categoria oculta" };
        draft.ui.nameModalId = null;
      });
    },
    async excluirCategoria(id: string) {
      const updated = await apiExcluirCategoria(id);
      setImmer((draft) => {
        draft.categories.list = draft.categories.list.map((cat) =>
          cat.id === id ? { ...cat, deleted_at: updated.deleted_at } : cat,
        );
        draft.toast = { type: "info", message: "Categoria excluída" };
        draft.ui.nameModalId = null;
      });
    },
    async salvarMeta(categoryId: string, payload: Partial<BudgetGoal>) {
      if (!payload.type || !payload.amount_cents) {
        throw new Error("Informe os dados da meta");
      }
      const goal = await apiSalvarMeta(categoryId, payload);
      setImmer((draft) => {
        draft.goals.byCategoryId[categoryId] = goal;
        draft.toast = { type: "success", message: "Salvo com sucesso" };
      });
    },
    async removerMeta(categoryId: string) {
      await apiRemoverMeta(categoryId);
      setImmer((draft) => {
        delete draft.goals.byCategoryId[categoryId];
        draft.toast = { type: "info", message: "Meta removida" };
      });
    },
    async aplicarMeta(categoryId: string) {
      const month = get().month.selected;
      const response = await aplicarMeta(categoryId, month);
      setImmer((draft) => {
        updateAllocation(draft, categoryId, month, (allocation) => {
          allocation.assigned_cents = response.allocation.assigned_cents;
          allocation.activity_cents = response.allocation.activity_cents;
          allocation.available_cents = response.allocation.available_cents;
          allocation.prev_available_cents = response.allocation.prev_available_cents;
        });
        const totals = draft.totalsByMonth[month] ?? { assigned: 0, activity: 0, available: 0 };
        totals.assigned = Object.values(draft.allocations.byCategoryIdMonth)
          .map((months) => months[month]?.assigned_cents ?? 0)
          .reduce((acc, value) => acc + value, 0);
        totals.available = Object.values(draft.allocations.byCategoryIdMonth)
          .map((months) => months[month]?.available_cents ?? 0)
          .reduce((acc, value) => acc + value, 0);
        draft.totalsByMonth[month] = totals;
        const inflows = draft.inflowsByMonth[month] ?? 0;
        draft.readyToAssignByMonth[month] = calcularAAtribuir(inflows, totals.assigned);
        draft.toast = { type: "success", message: "Meta aplicada" };
        updateNextMonthPrevAvailable(draft, categoryId, month, response.allocation.available_cents);
        const history = captureHistory(draft as unknown as BudgetPlannerState);
        draft.history.past.push(history);
        if (draft.history.past.length > MAX_HISTORY) {
          draft.history.past.shift();
        }
        draft.history.future = [];
      });
    },
    async editarAtribuido(categoryId: string, valor: number) {
      const month = get().month.selected;
      const state = get();
      const allocations = state.allocations.byCategoryIdMonth;
      const current = allocations[categoryId]?.[month];
      const previous = current ? { ...current } : undefined;
      const totalsPrev = {
        ...(state.totalsByMonth[month] ?? { assigned: 0, activity: 0, available: 0 }),
      };
      const readyPrev = state.readyToAssignByMonth[month] ?? 0;

      setImmer((draft) => {
        updateAllocation(draft, categoryId, month, (allocation) => {
          const prevAvailable = allocation.prev_available_cents;
          allocation.assigned_cents = valor;
          allocation.available_cents = calcularDisponivel(
            prevAvailable,
            valor,
            allocation.activity_cents,
          );
        });
        const totals = draft.totalsByMonth[month] ?? { assigned: 0, activity: 0, available: 0 };
        totals.assigned += valor - (previous?.assigned_cents ?? 0);
        totals.available +=
          (draft.allocations.byCategoryIdMonth[categoryId][month].available_cents ?? 0) -
          (previous?.available_cents ?? 0);
        draft.totalsByMonth[month] = totals;
        const inflows = draft.inflowsByMonth[month] ?? 0;
        draft.readyToAssignByMonth[month] = calcularAAtribuir(inflows, totals.assigned);
        updateNextMonthPrevAvailable(
          draft,
          categoryId,
          month,
          draft.allocations.byCategoryIdMonth[categoryId][month].available_cents,
        );
      });

      try {
        const response = await editarAtribuicao(categoryId, month, valor);
        setImmer((draft) => {
          updateAllocation(draft, categoryId, month, (allocation) => {
            allocation.assigned_cents = response.allocation.assigned_cents;
            allocation.activity_cents = response.allocation.activity_cents;
            allocation.available_cents = response.allocation.available_cents;
            allocation.prev_available_cents = response.allocation.prev_available_cents;
          });
          const totals = draft.totalsByMonth[month] ?? { assigned: 0, activity: 0, available: 0 };
          totals.assigned += response.allocation.assigned_cents - valor;
          totals.available +=
            response.allocation.available_cents -
            draft.allocations.byCategoryIdMonth[categoryId][month].available_cents;
          totals.assigned = Object.values(draft.allocations.byCategoryIdMonth)
            .map((months) => months[month]?.assigned_cents ?? 0)
            .reduce((acc, value) => acc + value, 0);
          totals.available = Object.values(draft.allocations.byCategoryIdMonth)
            .map((months) => months[month]?.available_cents ?? 0)
            .reduce((acc, value) => acc + value, 0);
          draft.totalsByMonth[month] = totals;
          const inflows = draft.inflowsByMonth[month] ?? 0;
          draft.readyToAssignByMonth[month] = calcularAAtribuir(inflows, totals.assigned);
          updateNextMonthPrevAvailable(
            draft,
            categoryId,
            month,
            response.allocation.available_cents,
          );
          draft.toast = { type: "success", message: "Salvo com sucesso" };
          draft.history.past.push(captureHistory(draft as unknown as BudgetPlannerState));
          if (draft.history.past.length > MAX_HISTORY) {
            draft.history.past.shift();
          }
          draft.history.future = [];
        });
      } catch (error) {
        setImmer((draft) => {
          if (previous) {
            updateAllocation(draft, categoryId, month, (allocation) => {
              allocation.assigned_cents = previous.assigned_cents;
              allocation.activity_cents = previous.activity_cents;
              allocation.available_cents = previous.available_cents;
              allocation.prev_available_cents = previous.prev_available_cents;
            });
          }
          draft.totalsByMonth[month] = totalsPrev;
          draft.readyToAssignByMonth[month] = readyPrev;
          updateNextMonthPrevAvailable(draft, categoryId, month, previous?.available_cents ?? 0);
          draft.toast = { type: "error", message: "Erro ao salvar" };
        });
        throw error;
      }
    },
    desfazer() {
      setImmer((draft) => {
        const last = draft.history.past.pop();
        if (!last) return;
        draft.history.future.unshift(captureHistory(draft as unknown as BudgetPlannerState));
        applyHistorySnapshot(setImmer, last);
      });
    },
    refazer() {
      setImmer((draft) => {
        const next = draft.history.future.shift();
        if (!next) return;
        draft.history.past.push(captureHistory(draft as unknown as BudgetPlannerState));
        applyHistorySnapshot(setImmer, next);
      });
    },
  };
});

export const budgetPlannerSelectors = {
  useMonth: () => useBudgetPlannerStore((state) => state.month.selected),
  useCategories: () => useBudgetPlannerStore((state) => state.categories.list),
  useGroups: () =>
    useBudgetPlannerStore((state) =>
      agruparCategorias(
        state.categories.list.filter((cat) =>
          state.ui.showHidden ? true : !cat.is_hidden && !cat.deleted_at,
        ),
      ),
    ),
  useLoading: () => useBudgetPlannerStore((state) => state.categories.loading),
  useToast: () => useBudgetPlannerStore((state) => state.toast),
  useUI: () => useBudgetPlannerStore((state) => state.ui),
  useReadyToAssign: (month: string) =>
    useBudgetPlannerStore((state) => state.readyToAssignByMonth[month] ?? 0),
  useTotals: (month: string) =>
    useBudgetPlannerStore(
      (state) => state.totalsByMonth[month] ?? { assigned: 0, activity: 0, available: 0 },
    ),
  useSubfinanciadas: (month: string) =>
    useBudgetPlannerStore((state) => {
      return state.categories.list
        .filter((cat) => !cat.deleted_at && !cat.is_hidden)
        .map((cat) => {
          const allocation = state.allocations.byCategoryIdMonth[cat.id]?.[month];
          const goal = state.goals.byCategoryId[cat.id];
          const projection = calcularProjecaoMeta(goal, allocation, month);
          return projection && projection.falta > 0
            ? { category: cat, falta: projection.falta, projection }
            : null;
        })
        .filter(
          (
            item,
          ): item is {
            category: BudgetCategory;
            falta: number;
            projection: NonNullable<ReturnType<typeof calcularProjecaoMeta>>;
          } => Boolean(item),
        );
    }),
  useGoalProgress: (categoryId: string, month: string) =>
    useBudgetPlannerStore((state) =>
      calcularProjecaoMeta(
        state.goals.byCategoryId[categoryId],
        state.allocations.byCategoryIdMonth[categoryId]?.[month],
        month,
      ),
    ),
  prontoParaAtribuir: (month: string, state?: BudgetPlannerState) => {
    const store = state ?? useBudgetPlannerStore.getState();
    return store.readyToAssignByMonth[month] ?? 0;
  },
  totais: (month: string, state?: BudgetPlannerState) => {
    const store = state ?? useBudgetPlannerStore.getState();
    return store.totalsByMonth[month] ?? { assigned: 0, activity: 0, available: 0 };
  },
};

export type { BudgetAllocation, BudgetCategory, BudgetGoal };
export { normalizarValorMonetario };
