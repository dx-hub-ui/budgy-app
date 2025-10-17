import { authFetch } from "@/lib/authFetch";

export type UUID = string;

export type BudgetCategory = {
  id: UUID;
  group_name: string;
  name: string;
  icon: string | null;
  sort: number;
  is_hidden: boolean;
  deleted_at: string | null;
  created_at: string;
};

export type BudgetGoalType = "TB" | "TBD" | "MFG" | "CUSTOM";

export type BudgetGoal = {
  id: UUID;
  org_id: UUID;
  category_id: UUID;
  type: BudgetGoalType;
  amount_cents: number;
  target_month: string | null;
  cadence: "weekly" | "monthly" | "yearly" | "custom" | null;
  created_at: string;
};

export type BudgetAllocation = {
  category_id: UUID;
  month: string;
  assigned_cents: number;
  activity_cents: number;
  available_cents: number;
  prev_available_cents: number;
};

export type BudgetSnapshot = {
  month: string;
  categories: BudgetCategory[];
  goals: BudgetGoal[];
  allocations: BudgetAllocation[];
  ready_to_assign_cents: number;
  inflows_cents: number;
  total_assigned_cents: number;
  total_activity_cents: number;
  total_available_cents: number;
};

export type BudgetCategoryGroup = {
  name: string;
  categories: BudgetCategory[];
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  year: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo"
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2
});

export function formatMonthLabel(month: string) {
  const [year, monthPart] = month.split("-");
  // Use noon UTC to avoid timezone offsets pushing the label to the
  // previous month when formatting in America/Sao_Paulo.
  const date = new Date(Date.UTC(Number(year), Number(monthPart) - 1, 1, 12));
  return MONTH_FORMATTER.format(date);
}

export function fmtBRL(value: number) {
  return CURRENCY_FORMATTER.format(value / 100);
}

export function calcularDisponivel(
  disponivelAnterior: number,
  atribuidoMes: number,
  atividadeMes: number
) {
  return disponivelAnterior + atribuidoMes - atividadeMes;
}

export function calcularAAtribuir(entradasMes: number, totalAtribuido: number) {
  return entradasMes - totalAtribuido;
}

export function aplicarEstouroEmDinheiro(
  disponivelAtual: number,
  proximoAAtribuir: number
) {
  if (disponivelAtual >= 0) return proximoAAtribuir;
  return Math.max(proximoAAtribuir + disponivelAtual, 0);
}

export type GoalProjection = {
  necessarioNoMes: number;
  falta: number;
  atribuido: number;
  progresso: number;
  alvo: number;
};

function monthToDate(month: string) {
  const [year, monthPart] = month.split("-");
  return new Date(Date.UTC(Number(year), Number(monthPart) - 1, 1));
}

function compareMonth(a: string, b: string) {
  return monthToDate(a).getTime() - monthToDate(b).getTime();
}

export function calcularProjecaoMeta(
  goal: BudgetGoal | undefined,
  allocation: BudgetAllocation | undefined,
  month: string
): GoalProjection | null {
  if (!goal || !allocation) return null;
  const atribuido = allocation.assigned_cents;
  const disponivel = allocation.available_cents;
  const alvo = goal.amount_cents;
  let necessarioNoMes = 0;

  switch (goal.type) {
    case "MFG": {
      necessarioNoMes = Math.max(alvo - atribuido, 0);
      break;
    }
    case "TB": {
      necessarioNoMes = Math.max(alvo - disponivel, 0);
      break;
    }
    case "TBD": {
      if (!goal.target_month) return null;
      const target = goal.target_month.slice(0, 7);
      if (compareMonth(month, target) > 0) {
        necessarioNoMes = 0;
      } else {
        const mesesRestantes =
          Math.max(
            1,
            Math.round(
              (monthToDate(goal.target_month).getTime() - monthToDate(month).getTime()) /
                (1000 * 60 * 60 * 24 * 30.4375)
            ) + 1
          );
        const saldoNecessario = Math.max(alvo - disponivel, 0);
        necessarioNoMes = Math.ceil(saldoNecessario / mesesRestantes);
      }
      break;
    }
    case "CUSTOM": {
      necessarioNoMes = Math.max(alvo - atribuido, 0);
      break;
    }
    default:
      necessarioNoMes = 0;
  }

  const falta = Math.max(necessarioNoMes - atribuido, 0);
  const progresso = alvo === 0 ? 1 : Math.min(disponivel / alvo, 1);
  return {
    necessarioNoMes,
    falta,
    atribuido,
    progresso,
    alvo
  };
}

export function agruparCategorias(categories: BudgetCategory[]): BudgetCategoryGroup[] {
  const groups = new Map<string, BudgetCategory[]>();
  categories
    .filter((cat) => !cat.deleted_at)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .forEach((cat) => {
      if (!groups.has(cat.group_name)) {
        groups.set(cat.group_name, []);
      }
      groups.get(cat.group_name)!.push(cat);
    });
  return Array.from(groups.entries()).map(([name, cats]) => ({ name, categories: cats }));
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  headers.set("Content-Type", "application/json");

  const res = await authFetch(input, {
    ...init,
    headers
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Erro na requisição de orçamento");
  }
  return res.json() as Promise<T>;
}

const API_BASE = "/api/budget";

export async function carregarSnapshotOrcamento(month: string) {
  return fetchJson<BudgetSnapshot>(`${API_BASE}/categories?month=${month}`);
}

export async function criarCategoria(payload: { group_name: string; name: string; icon?: string | null }) {
  return fetchJson<BudgetCategory>(`${API_BASE}/category`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function salvarNomeCategoria(id: string, nome: string) {
  return fetchJson<BudgetCategory>(`${API_BASE}/category/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: nome })
  });
}

export async function ocultarCategoria(id: string) {
  return fetchJson<BudgetCategory>(`${API_BASE}/category/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_hidden: true })
  });
}

export async function excluirCategoria(id: string) {
  return fetchJson<BudgetCategory>(`${API_BASE}/category/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ deleted_at: new Date().toISOString() })
  });
}

export async function salvarMeta(categoryId: string, payload: Partial<BudgetGoal>) {
  return fetchJson<BudgetGoal>(`${API_BASE}/goal/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function removerMeta(categoryId: string) {
  const res = await authFetch(`${API_BASE}/goal/${categoryId}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Erro ao remover meta");
  }
}

export async function aplicarMeta(categoryId: string, month: string) {
  return fetchJson<{ diff_cents: number; allocation: BudgetAllocation }>(
    `${API_BASE}/goal/${categoryId}/apply`,
    {
      method: "POST",
      body: JSON.stringify({ month })
    }
  );
}

export async function editarAtribuicao(
  categoryId: string,
  month: string,
  valor: number
) {
  return fetchJson<{ allocation: BudgetAllocation }>(`${API_BASE}/allocation`, {
    method: "PUT",
    body: JSON.stringify({ categoryId, month, assigned_cents: valor })
  });
}

export function normalizarValorMonetario(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return 0;
  return parseInt(digits, 10);
}

export function formatarInputMonetario(valorCentavos: number) {
  return CURRENCY_FORMATTER.format(valorCentavos / 100);
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function mesAtual() {
  return monthKey(new Date());
}
