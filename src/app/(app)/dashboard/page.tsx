"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, CreditCard, PiggyBank, Wallet2 } from "lucide-react";

import Card, { CardActions, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Stat from "@/components/ui/Stat";
import LineChart from "@/components/charts/LineChart";
import RecentTable, { type RecentRow } from "@/components/transactions/RecentTable";
import { listExpensesByMonth, type MonthFilter } from "@/domain/repo";

type DashboardState = {
  chart: {
    labels: string[];
    data: number[];
  };
  transactions: RecentRow[];
  balances: {
    total: number;
    main: number;
    savings: number;
    expenses: number;
  };
  deltas: {
    total: string;
    savings: string;
    expenses: string;
  };
};

const fallbackData: DashboardState = {
  chart: {
    labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    data: [49520, 49780, 49340, 50010, 50420, 50890, 51230],
  },
  transactions: [
    {
      id: "1",
      name: "Supermercado Real",
      note: "Método: CARTÃO CRÉDITO",
      date: "12/04/2024",
      time: "10:24",
      status: "completed" as const,
      amount: 284.5,
    },
    {
      id: "2",
      name: "Assinatura Stream+",
      note: "Método: PIX",
      date: "11/04/2024",
      time: "07:15",
      status: "completed" as const,
      amount: 39.9,
    },
    {
      id: "3",
      name: "Posto Lago Azul",
      note: "Método: CARTÃO DÉBITO",
      date: "10/04/2024",
      time: "19:42",
      status: "completed" as const,
      amount: 212.7,
    },
    {
      id: "4",
      name: "Padaria Sol Nascente",
      note: "Método: DINHEIRO",
      date: "09/04/2024",
      time: "08:08",
      status: "pending" as const,
      amount: 32.4,
    },
    {
      id: "5",
      name: "Academia Viva",
      note: "Plano mensal",
      date: "08/04/2024",
      time: "06:45",
      status: "completed" as const,
      amount: 139.0,
    },
    {
      id: "6",
      name: "Restaurante Dona Maria",
      note: "Método: CARTÃO DÉBITO",
      date: "07/04/2024",
      time: "13:27",
      status: "failed" as const,
      amount: 86.9,
    },
  ] satisfies RecentRow[],
  balances: {
    total: 51230,
    main: 32180,
    savings: 19050,
    expenses: 795.4,
  },
  deltas: {
    total: "+3,2%",
    savings: "+8,4%",
    expenses: "-5,1%",
  },
};

type Expense = Awaited<ReturnType<typeof listExpensesByMonth>>[number];

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function getCurrentFilter(): MonthFilter {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function toCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "--";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "--:--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toMethodLabel(method: string | null | undefined) {
  if (!method) return undefined;
  return `Método: ${method.toUpperCase()}`;
}

function buildFromExpenses(expenses: Expense[]): DashboardState {
  const baseBalance = 54000;
  const totalsByDay = new Map<string, number>();
  let monthlyExpenses = 0;

  expenses.forEach((expense) => {
    const value = ((expense?.amount_cents ?? 0) as number) / 100;
    monthlyExpenses += value;
    if (expense?.date) {
      const current = totalsByDay.get(expense.date) ?? 0;
      totalsByDay.set(expense.date, current + value);
    }
  });

  const days: Date[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    days.push(day);
  }

  let running = baseBalance;
  const labels: string[] = [];
  const data: number[] = [];

  days.forEach((day) => {
    const iso = formatISO(day);
    const spent = totalsByDay.get(iso) ?? 0;
    running = Math.max(0, running - spent);
    labels.push(formatLabel(day));
    data.push(Number(running.toFixed(2)));
  });

  const total = Number(running.toFixed(2));
  const main = Number((total * 0.64).toFixed(2));
  const savings = Number((total - main).toFixed(2));

  const diff = total - fallbackData.balances.total;
  const totalDelta = `${diff >= 0 ? "+" : "-"}${Math.abs((diff / fallbackData.balances.total) * 100).toFixed(1)}%`;
  const savingsDelta = `+${Math.max(2, Math.min(9, ((savings - fallbackData.balances.savings) / Math.max(1, fallbackData.balances.savings)) * 100)).toFixed(1)}%`;
  const expensesDelta = `-${Math.min(9.9, (monthlyExpenses / baseBalance) * 100).toFixed(1)}%`;

  const transactions: RecentRow[] = expenses
    .slice()
    .sort((a, b) => {
      const dateA = new Date((a?.created_at as string) ?? `${a?.date ?? ""}T00:00:00`).getTime();
      const dateB = new Date((b?.created_at as string) ?? `${b?.date ?? ""}T00:00:00`).getTime();
      return dateB - dateA;
    })
    .slice(0, 6)
    .map((expense, index) => ({
      id: (expense?.id as string) ?? `expense-${index}`,
      name: expense?.description ?? "Despesa",
      note: toMethodLabel(expense?.method as string),
      date: formatDate(expense?.date as string),
      time: formatTime((expense?.created_at as string) ?? null),
      status: "completed",
      amount: ((expense?.amount_cents ?? 0) as number) / 100,
    }));

  return {
    chart: { labels, data },
    transactions: transactions.length > 0 ? transactions : fallbackData.transactions,
    balances: {
      total,
      main,
      savings,
      expenses: Number(monthlyExpenses.toFixed(2)),
    },
    deltas: {
      total: totalDelta,
      savings: savingsDelta,
      expenses: expensesDelta,
    },
  };
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setLoading(false);
      return;
    }

    let active = true;
    async function load() {
      try {
        const expenses = await listExpensesByMonth(getCurrentFilter());
        if (!active) return;
        const computed = buildFromExpenses(expenses ?? []);
        setState(computed);
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setState(fallbackData);
        setError("Não foi possível sincronizar com o Supabase. Mostrando dados demonstrativos.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        icon: <Wallet2 size={18} />,
        label: "Saldo total",
        value: toCurrency(state.balances.total),
        delta: { value: state.deltas.total, positive: !state.deltas.total.startsWith("-") },
      },
      {
        icon: <CreditCard size={18} />,
        label: "Conta principal",
        value: toCurrency(state.balances.main),
      },
      {
        icon: <PiggyBank size={18} />,
        label: "Poupança",
        value: toCurrency(state.balances.savings),
        delta: { value: state.deltas.savings, positive: true },
      },
      {
        icon: <ArrowDownRight size={18} />,
        label: "Despesas do mês",
        value: toCurrency(state.balances.expenses),
        delta: { value: state.deltas.expenses, positive: false },
      },
    ],
    [state]
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[var(--cc-content-maxw)] flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm uppercase tracking-wider text-[var(--muted)]">Painel</p>
          <h1 className="text-3xl font-semibold">Visão geral</h1>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do saldo</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            {loading ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-[var(--muted)]">
                Carregando dados…
              </div>
            ) : (
              <LineChart labels={state.chart.labels} data={state.chart.data} ariaLabel="Gráfico de linha com evolução do saldo" />
            )}
          </CardContent>
          {error && (
            <p className="px-6 pb-6 text-sm text-amber-500">{error}</p>
          )}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {stats.map((stat) => (
            <Stat
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              delta={stat.delta}
              menuLabel={`Abrir menu de opções para ${stat.label}`}
            />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader className="flex flex-wrap items-center gap-3 pb-3">
          <CardTitle>Transações recentes</CardTitle>
          <CardActions>
            <Link
              href="/expenses"
              className="text-sm font-medium text-[var(--brand)] underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg-light)] dark:focus-visible:ring-offset-[var(--card-bg-dark)]"
            >
              Ver todas
            </Link>
          </CardActions>
        </CardHeader>
        <CardContent>
          {state.transactions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nenhuma transação encontrada para este período.</p>
          ) : (
            <RecentTable rows={state.transactions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
