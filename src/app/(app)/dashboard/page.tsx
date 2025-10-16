"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, CreditCard, PiggyBank, Wallet2 } from "lucide-react";

import Card, { CardActions, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Stat from "@/components/ui/Stat";
import LineChart from "@/components/charts/LineChart";
import RecentTable, { type RecentRow } from "@/components/transactions/RecentTable";
import { listExpensesByMonth, type MonthFilter } from "@/domain/repo";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const chartLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

type DashboardSnapshot = {
  chart: {
    labels: string[];
    data: number[];
  };
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
  transactions: RecentRow[];
};

const MOCK_SNAPSHOT: DashboardSnapshot = {
  chart: {
    labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    data: [49520, 49780, 49340, 50010, 50420, 50890, 51230],
  },
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
  transactions: [
    {
      id: "1",
      name: "Supermercado Real",
      note: "Método: CARTÃO CRÉDITO",
      date: "12/04/2024",
      time: "10:24",
      status: "completed",
      amount: 284.5,
    },
    {
      id: "2",
      name: "Assinatura Stream+",
      note: "Método: PIX",
      date: "11/04/2024",
      time: "07:15",
      status: "completed",
      amount: 39.9,
    },
    {
      id: "3",
      name: "Posto Lago Azul",
      note: "Método: CARTÃO DÉBITO",
      date: "10/04/2024",
      time: "19:42",
      status: "completed",
      amount: 212.7,
    },
    {
      id: "4",
      name: "Padaria Sol Nascente",
      note: "Método: DINHEIRO",
      date: "09/04/2024",
      time: "08:08",
      status: "pending",
      amount: 32.4,
    },
    {
      id: "5",
      name: "Academia Viva",
      note: "Plano mensal",
      date: "08/04/2024",
      time: "06:45",
      status: "completed",
      amount: 139,
    },
    {
      id: "6",
      name: "Restaurante Dona Maria",
      note: "Método: CARTÃO DÉBITO",
      date: "07/04/2024",
      time: "13:27",
      status: "failed",
      amount: 86.9,
    },
  ],
};

type Expense = Awaited<ReturnType<typeof listExpensesByMonth>>[number];

const hasSupabaseCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function currentMonth(): MonthFilter {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatChartLabel(date: Date) {
  return chartLabelFormatter
    .format(date)
    .replace(".", "")
    .replace(/\bde\b/gi, "")
    .trim();
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "--/--/----";
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return dateFormatter.format(parsed);
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "--:--";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return timeFormatter.format(parsed);
}

function normalizeStatus(expense: Expense): RecentRow["status"] {
  const value = (expense?.status as string | undefined)?.toLowerCase();
  if (value === "pending" || value === "completed" || value === "failed") {
    return value;
  }
  return "completed";
}

function toMethodLabel(method: string | null | undefined) {
  if (!method) return undefined;
  return `Método: ${method.toUpperCase()}`;
}

function formatDelta(current: number, baseline: number) {
  if (!Number.isFinite(baseline) || baseline === 0) {
    return "+0,0%";
  }
  const diff = Number((((current - baseline) / Math.abs(baseline)) * 100).toFixed(1));
  const sign = diff >= 0 ? "+" : "-";
  const formatted = Math.abs(diff).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${formatted}%`;
}

function buildSnapshot(expenses: Expense[]): DashboardSnapshot {
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const baseBalance = 54000;
  const totalsByDay = new Map<string, number>();
  let monthlyExpenses = 0;

  safeExpenses.forEach((expense) => {
    const value = Number((expense?.amount_cents ?? 0) as number) / 100;
    monthlyExpenses += value;
    const isoDay = expense?.date as string | undefined;
    if (isoDay) {
      totalsByDay.set(isoDay, (totalsByDay.get(isoDay) ?? 0) + value);
    }
  });

  const days: Date[] = [];
  const today = new Date();
  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    days.push(day);
  }

  let running = baseBalance;
  const labels: string[] = [];
  const data: number[] = [];

  days.forEach((day) => {
    const iso = toISODate(day);
    const spent = totalsByDay.get(iso) ?? 0;
    running = Math.max(0, Number((running - spent).toFixed(2)));
    labels.push(formatChartLabel(day));
    data.push(running);
  });

  const total = data[data.length - 1] ?? baseBalance;
  const main = Number((total * 0.64).toFixed(2));
  const savings = Number((total - main).toFixed(2));

  const transactions: RecentRow[] = safeExpenses
    .slice()
    .sort((a, b) => {
      const dateA = new Date((a?.created_at as string) ?? `${a?.date ?? ""}T00:00:00`).getTime();
      const dateB = new Date((b?.created_at as string) ?? `${b?.date ?? ""}T00:00:00`).getTime();
      return dateB - dateA;
    })
    .slice(0, 10)
    .map((expense, index) => ({
      id: (expense?.id as string) ?? `expense-${index}`,
      name: expense?.description ?? "Despesa",
      note: toMethodLabel(expense?.method as string),
      date: formatDate(expense?.date as string),
      time: formatTime((expense?.created_at as string) ?? null),
      status: normalizeStatus(expense),
      amount: Number((expense?.amount_cents ?? 0) as number) / 100,
    }));

  return {
    chart: { labels, data },
    balances: {
      total,
      main,
      savings,
      expenses: Number(monthlyExpenses.toFixed(2)),
    },
    deltas: {
      total: formatDelta(total, MOCK_SNAPSHOT.balances.total),
      savings: formatDelta(savings, MOCK_SNAPSHOT.balances.savings),
      expenses: formatDelta(monthlyExpenses, MOCK_SNAPSHOT.balances.expenses),
    },
    transactions,
  };
}

function useDashboardSnapshot() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(MOCK_SNAPSHOT);
  const [loading, setLoading] = useState(hasSupabaseCredentials);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseCredentials) {
      return;
    }

    let active = true;
    setLoading(true);

    async function load() {
      try {
        const expenses = await listExpensesByMonth(currentMonth());
        if (!active) return;
        const computed = buildSnapshot(expenses ?? []);
        setSnapshot(computed);
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setSnapshot(MOCK_SNAPSHOT);
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
        value: formatCurrency(snapshot.balances.total),
        delta: {
          value: snapshot.deltas.total,
          positive: !snapshot.deltas.total.startsWith("-"),
        },
      },
      {
        icon: <CreditCard size={18} />,
        label: "Conta principal",
        value: formatCurrency(snapshot.balances.main),
      },
      {
        icon: <PiggyBank size={18} />,
        label: "Poupança",
        value: formatCurrency(snapshot.balances.savings),
        delta: {
          value: snapshot.deltas.savings,
          positive: !snapshot.deltas.savings.startsWith("-"),
        },
      },
      {
        icon: <ArrowDownRight size={18} />,
        label: "Despesas do mês",
        value: formatCurrency(snapshot.balances.expenses),
        delta: {
          value: snapshot.deltas.expenses,
          positive: snapshot.deltas.expenses.startsWith("-"),
        },
      },
    ],
    [snapshot],
  );

  return {
    snapshot,
    stats,
    loading,
    error,
  };
}

export default function DashboardPage() {
  const { snapshot, stats, loading, error } = useDashboardSnapshot();

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="grid gap-6 md:grid-cols-12">
        <header className="md:col-span-12">
          <div className="cc-stack-24">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--cc-text-muted)]">
              Painel
            </p>
          </div>
        </header>

        <Card className="cc-chart md:col-span-12 lg:col-span-8">
          <CardHeader>
            <CardTitle>Evolução do saldo</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            {loading ? (
              <div
                className="flex h-[280px] items-center justify-center text-sm text-[var(--cc-text-muted)]"
                role="status"
                aria-live="polite"
              >
                Carregando dados…
              </div>
            ) : (
              <LineChart
                labels={snapshot.chart.labels}
                data={snapshot.chart.data}
                ariaLabel="Gráfico de linha com evolução do saldo"
              />
            )}
          </CardContent>
          {error && (
            <p className="text-sm text-amber-500" role="alert">
              {error}
            </p>
          )}
        </Card>

        <div className="cc-stack-24 md:col-span-12 lg:col-span-4">
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

        <Card className="md:col-span-12 lg:col-span-8">
          <CardHeader className="flex flex-wrap items-center gap-3 pb-3">
            <CardTitle>Transações recentes</CardTitle>
            <CardActions>
              <Link
                href="/expenses"
                className="text-sm font-medium text-[var(--brand)] underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cc-surface)]"
              >
                Ver todas
              </Link>
            </CardActions>
          </CardHeader>
          <CardContent>
            {snapshot.transactions.length === 0 ? (
              <p className="text-sm text-[var(--cc-text-muted)]">
                Nenhuma transação encontrada para este período.
              </p>
            ) : (
              <RecentTable rows={snapshot.transactions} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
