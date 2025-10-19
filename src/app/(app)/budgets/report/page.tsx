"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, PiggyBank, PieChart, Timer, TrendingDown, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import Stat from "@/components/ui/Stat";
import { fmtBRL } from "@/domain/format";
import { listAccounts, listBudgetCategories } from "@/domain/repo";
import {
  buildRecentMonthOptions,
  fetchDashboardReport,
  type DashboardReport
} from "@/domain/reports";

const SpendingBreakdownChart = dynamic(
  () => import("@/components/reports/SpendingBreakdownChart"),
  { ssr: false }
);
const SpendingTrendChart = dynamic(() => import("@/components/reports/SpendingTrendChart"), {
  ssr: false
});
const NetWorthChart = dynamic(() => import("@/components/reports/NetWorthChart"), {
  ssr: false
});

type Option = { value: string; label: string };

type TabId = "breakdown" | "trends" | "net" | "income" | "age";

type KpiItem = { id: string; node: ReactNode };

const tabs: Array<{ id: TabId; label: string; description: string; icon: LucideIcon }> = [
  { id: "breakdown", label: "Distribuição", description: "Categorias com maior peso nos gastos", icon: PieChart },
  { id: "trends", label: "Tendências", description: "Evolução mensal consolidada", icon: Activity },
  { id: "net", label: "Patrimônio", description: "Contas e saldos consolidados", icon: PiggyBank },
  { id: "income", label: "Receita vs. despesa", description: "Entrada, saída e saldo", icon: Wallet },
  { id: "age", label: "Idade do dinheiro", description: "Sustentação do caixa", icon: Timer }
];

function formatPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value);
}

function formatDays(days: number | null) {
  if (days === null) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(days);
}

export default function BudgetReportPage() {
  const monthOptions = useMemo(() => buildRecentMonthOptions(), []);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([
    { value: "all", label: "Todas as categorias" }
  ]);
  const [accountOptions, setAccountOptions] = useState<Option[]>([
    { value: "all", label: "Todas as contas" }
  ]);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]?.value ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabId>("breakdown");
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFilters() {
      try {
        setFiltersError(null);
        const [categories, accounts] = await Promise.all([
          listBudgetCategories(),
          listAccounts()
        ]);
        if (cancelled) return;
        const categoryItems: Option[] = [
          { value: "all", label: "Todas as categorias" },
          ...categories.map((category) => ({
            value: category.id,
            label: `${category.group_name ?? "Sem grupo"} · ${category.name}`
          }))
        ];
        const accountItems: Option[] = [
          { value: "all", label: "Todas as contas" },
          ...accounts.map((account) => ({ value: account.id, label: account.name }))
        ];
        setCategoryOptions(categoryItems);
        setAccountOptions(accountItems);
      } catch (err: any) {
        console.error(err);
        if (cancelled) return;
        setFiltersError(err.message ?? "Não foi possível carregar os filtros.");
      }
    }
    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadReport() {
      if (!selectedMonth) return;
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboardReport({
          month: selectedMonth,
          categoryId: selectedCategory === "all" ? null : selectedCategory,
          accountId: selectedAccount === "all" ? null : selectedAccount
        });
        if (cancelled) return;
        setReport(data);
      } catch (err: any) {
        if (cancelled) return;
        console.error(err);
        setError(err.message ?? "Falha ao carregar o relatório.");
        setReport(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, selectedCategory, selectedAccount]);

  const selectedMonthLabel = useMemo(
    () => monthOptions.find((option) => option.value === selectedMonth)?.label ?? "",
    [monthOptions, selectedMonth]
  );

  const monthlyComparison = useMemo(() => {
    if (!report) return null;
    const totals = report.trends.totals;
    if (!totals.length) return null;
    const current = totals[totals.length - 1] ?? 0;
    const previous = totals.length > 1 ? totals[totals.length - 2] ?? 0 : null;
    return { current, previous };
  }, [report]);

  const kpis = useMemo((): KpiItem[] => {
    if (!report) return [];
    const { current, previous } = monthlyComparison ?? { current: report.totalSpending, previous: null };
    const spendingDelta =
      previous !== null
        ? {
            value: `${fmtBRL(current - previous)} vs mês anterior`,
            positive: current <= previous
          }
        : undefined;

    const effectiveCurrent = current ?? report.totalSpending;
    const trendAverageDelta = {
      value: `${fmtBRL(effectiveCurrent)} atual vs ${fmtBRL(Math.round(report.trends.average))} média`,
      positive: effectiveCurrent <= report.trends.average
    };

    return [
      {
        id: "spending",
        node: (
          <Stat
            icon={<Wallet className="h-5 w-5" aria-hidden />}
            label="Gasto monitorado"
            value={fmtBRL(report.totalSpending)}
            delta={spendingDelta}
          />
        )
      },
      {
        id: "average",
        node: (
          <Stat
            icon={<Activity className="h-5 w-5" aria-hidden />}
            label="Média de 6 meses"
            value={fmtBRL(Math.round(report.trends.average))}
            delta={trendAverageDelta}
          />
        )
      },
      {
        id: "net",
        node: (
          <Stat
            icon={<TrendingDown className="h-5 w-5" aria-hidden />}
            label="Receita menos despesa"
            value={fmtBRL(report.incomeExpense.net)}
            delta={{
              value: `${fmtBRL(report.incomeExpense.income)} receitas / ${fmtBRL(report.incomeExpense.expense)} despesas`,
              positive: report.incomeExpense.net >= 0
            }}
          />
        )
      },
      {
        id: "net-worth",
        node: (
          <Stat
            icon={<PiggyBank className="h-5 w-5" aria-hidden />}
            label="Patrimônio líquido"
            value={fmtBRL(report.netWorth.net)}
            delta={{
              value: `${fmtBRL(report.netWorth.assets)} ativos / ${fmtBRL(Math.abs(report.netWorth.debts))} dívidas`,
              positive: report.netWorth.net >= 0
            }}
          />
        )
      }
    ];
  }, [monthlyComparison, report]);

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="cc-stack-32">
        <header className="relative overflow-hidden rounded-3xl border border-[var(--cc-border)] bg-gradient-to-r from-[var(--brand-soft-bg)] via-white to-white p-8 shadow-sm dark:via-[var(--cc-surface)] dark:to-[var(--cc-surface)]">
          <div className="pointer-events-none absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[var(--brand-soft-bg)] opacity-60 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[var(--brand-soft-bg)] opacity-50 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="cc-stack-16">
              <span className="inline-flex w-fit items-center rounded-full border border-[var(--cc-border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)] shadow-sm">
                Relatórios de orçamento
              </span>
              <div className="cc-stack-8">
                <h1 className="text-3xl font-semibold text-[var(--cc-text-strong)]">Visão consolidada de {selectedMonthLabel}</h1>
                <p className="max-w-2xl text-sm text-[var(--cc-text-muted)]">
                  Ajuste os filtros para navegar entre contas e categorias. Todos os gráficos, indicadores e listas são atualizados imediatamente a partir dos dados do Supabase.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="month-filter" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cc-text-muted)]">
                  Mês
                </label>
                <select
                  id="month-filter"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-xl border border-[var(--cc-border-strong)] bg-white/90 px-3 py-2 text-sm font-medium text-[var(--cc-text-strong)] shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-[var(--ring)] dark:bg-[var(--cc-surface-strong)]"
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="category-filter" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cc-text-muted)]">
                  Categoria
                </label>
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="rounded-xl border border-[var(--cc-border-strong)] bg-white/90 px-3 py-2 text-sm font-medium text-[var(--cc-text-strong)] shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-[var(--ring)] dark:bg-[var(--cc-surface-strong)]"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="account-filter" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cc-text-muted)]">
                  Conta
                </label>
                <select
                  id="account-filter"
                  value={selectedAccount}
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  className="rounded-xl border border-[var(--cc-border-strong)] bg-white/90 px-3 py-2 text-sm font-medium text-[var(--cc-text-strong)] shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-[var(--ring)] dark:bg-[var(--cc-surface-strong)]"
                >
                  {accountOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {filtersError && (
            <p className="relative mt-4 text-sm text-red-600" role="alert">
              {filtersError}
            </p>
          )}
        </header>

        <section className="md:col-span-12">
          <div className="cc-card flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="month-filter" className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                Mês
              </label>
              <select
                id="month-filter"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-lg border border-[var(--cc-border)] bg-white px-3 py-2 text-sm text-[var(--cc-text-strong)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="category-filter"
                className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]"
              >
                Categoria
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="rounded-lg border border-[var(--cc-border)] bg-white px-3 py-2 text-sm text-[var(--cc-text-strong)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="account-filter"
                className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]"
              >
                Conta
              </label>
              <select
                id="account-filter"
                value={selectedAccount}
                onChange={(event) => setSelectedAccount(event.target.value)}
                className="rounded-lg border border-[var(--cc-border)] bg-white px-3 py-2 text-sm text-[var(--cc-text-strong)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {accountOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {filtersError && (
              <p className="mt-2 w-full text-sm text-red-600" role="alert">
                {filtersError}
              </p>
            )}
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-live="polite">
            {[0, 1, 2, 3].map((item) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-dashed border-[var(--cc-border)] bg-[color-mix(in_oklab,var(--cc-surface) 94%,white)]"
              />
            ))}
          </div>
        )}

        {report ? (
          <div className="cc-stack-32">
            <section>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((item) => (
                  <div key={item.id}>{item.node}</div>
                ))}
              </div>
            </section>

            <section className="cc-stack-16">
              <nav className="flex flex-wrap gap-3" aria-label="Seções do relatório">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-colors ${
                        isActive
                          ? "border-[var(--brand)] bg-[var(--brand-soft-bg)] shadow-sm"
                          : "border-[var(--cc-border)] bg-[var(--cc-surface)] hover:border-[var(--brand)] hover:bg-[var(--brand-soft-bg)]"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-[var(--brand)] shadow-sm">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="flex flex-col">
                          <span className="font-medium text-[var(--cc-text-strong)]">{tab.label}</span>
                          <span className="text-xs text-[var(--cc-text-muted)]">{tab.description}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="cc-card">
                {activeTab === "breakdown" && (
                  <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                      <h2 className="text-lg font-semibold text-[var(--cc-text-strong)]">Distribuição de gastos</h2>
                      <p className="text-sm text-[var(--cc-text-muted)]">
                        Entenda como as saídas foram distribuídas entre as categorias selecionadas.
                      </p>
                      <div className="mt-4 h-80">
                        {report.breakdown.length > 0 ? (
                          <SpendingBreakdownChart
                            labels={report.breakdown.map((item) => item.name)}
                            values={report.breakdown.map((item) => item.amount)}
                            colors={report.breakdown.map((item) => item.color)}
                          />
                        ) : (
                          <p className="text-sm text-[var(--cc-text-muted)]">Sem dados de gastos para o período.</p>
                        )}
                      </div>
                    </div>
                    <div className="lg:col-span-5">
                      <h3 className="text-sm font-semibold text-[var(--cc-text-strong)]">Categorias</h3>
                      <ul className="mt-4 space-y-3">
                        {report.breakdown.length === 0 && (
                          <li className="text-sm text-[var(--cc-text-muted)]">Nenhuma categoria com gastos registrados.</li>
                        )}
                        {report.breakdown.map((item) => (
                          <li key={item.id ?? item.name} className="rounded-lg border border-[var(--cc-border)] p-3">
                            <div className="flex items-center justify-between text-sm font-medium">
                              <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                {item.name}
                              </span>
                              <span>{fmtBRL(item.amount)}</span>
                            </div>
                            <div className="mt-2 h-2 w-full rounded-full bg-[var(--cc-border)]">
                              <span
                                className="block h-2 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(4, item.percentage * 100))}%`,
                                  backgroundColor: item.color
                                }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-[var(--cc-text-muted)]">
                              {formatPercentage(item.percentage)} do total do mês.
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === "trends" && (
                  <div className="cc-stack-24">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--cc-text-strong)]">Tendência de gastos</h2>
                      <p className="text-sm text-[var(--cc-text-muted)]">
                        Compare a evolução mensal dos gastos para entender o comportamento financeiro recente.
                      </p>
                    </div>
                    <div className="h-80">
                      <SpendingTrendChart labels={report.trends.labels} values={report.trends.totals} />
                    </div>
                    <p className="text-sm text-[var(--cc-text-muted)]">
                      Média mensal: <strong>{fmtBRL(report.trends.average)}</strong>
                    </p>
                  </div>
                )}

                {activeTab === "net" && (
                  <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                      <h2 className="text-lg font-semibold text-[var(--cc-text-strong)]">Patrimônio líquido</h2>
                      <p className="text-sm text-[var(--cc-text-muted)]">
                        Consolidação dos saldos das contas até o fim do mês selecionado.
                      </p>
                      <div className="mt-4 h-80">
                        <NetWorthChart
                          assets={report.netWorth.assets}
                          debts={report.netWorth.debts}
                          net={report.netWorth.net}
                        />
                      </div>
                    </div>
                    <div className="lg:col-span-5">
                      <h3 className="text-sm font-semibold text-[var(--cc-text-strong)]">Contas monitoradas</h3>
                      {report.netWorth.accounts.length === 0 ? (
                        <p className="mt-4 text-sm text-[var(--cc-text-muted)]">
                          Nenhuma movimentação encontrada para estimar o patrimônio.
                        </p>
                      ) : (
                        <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-[var(--cc-border)]">
                          <table className="min-w-full text-sm">
                            <thead className="bg-[var(--table-header-bg)] text-left text-xs uppercase text-[var(--cc-text-muted)]">
                              <tr>
                                <th className="px-4 py-2">Conta</th>
                                <th className="px-4 py-2">Tipo</th>
                                <th className="px-4 py-2 text-right">Saldo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.netWorth.accounts.map((account) => (
                                <tr key={account.id} className="border-t border-[var(--cc-border)]">
                                  <td className="px-4 py-2">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-[var(--cc-text-strong)]">{account.name}</span>
                                      <span className="text-xs text-[var(--cc-text-muted)]">{account.groupLabel}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-[var(--cc-text-muted)]">{account.type}</td>
                                  <td
                                    className={`px-4 py-2 text-right font-medium ${
                                      account.balance >= 0
                                        ? "text-[var(--success-600)]"
                                        : "text-[var(--danger-600)]"
                                    }`}
                                  >
                                    {fmtBRL(account.balance)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "income" && (
                  <div className="cc-stack-24">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--cc-text-strong)]">Receitas x Despesas</h2>
                      <p className="text-sm text-[var(--cc-text-muted)]">
                        Balanceamento entre entradas e saídas no mês selecionado.
                      </p>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-[var(--cc-border)]">
                      <table className="min-w-full text-sm">
                        <thead className="bg-[var(--table-header-bg)] text-left text-xs uppercase text-[var(--cc-text-muted)]">
                          <tr>
                            <th className="px-4 py-2">Resumo</th>
                            <th className="px-4 py-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-[var(--cc-border)]">
                            <td className="px-4 py-3 font-medium text-[var(--cc-text-strong)]">Receitas</td>
                            <td className="px-4 py-3 text-right">{fmtBRL(report.incomeExpense.income)}</td>
                          </tr>
                          <tr className="border-t border-[var(--cc-border)]">
                            <td className="px-4 py-3 font-medium text-[var(--cc-text-strong)]">Despesas</td>
                            <td className="px-4 py-3 text-right">{fmtBRL(report.incomeExpense.expense)}</td>
                          </tr>
                          <tr className="border-t border-[var(--cc-border)]">
                            <td className="px-4 py-3 font-medium text-[var(--cc-text-strong)]">Saldo</td>
                            <td className="px-4 py-3 text-right">{fmtBRL(report.incomeExpense.net)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-[var(--cc-text-muted)]">
                      Utilize este indicador para acompanhar a consistência dos resultados mensais e planejar ajustes.
                    </p>
                  </div>
                )}

                {activeTab === "age" && (
                  <div className="cc-stack-24">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--cc-text-strong)]">Idade do dinheiro</h2>
                      <p className="text-sm text-[var(--cc-text-muted)]">
                        Estimativa de quantos dias suas reservas atuais sustentam o nível de gastos do mês.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="cc-card cc-stack-12">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                          Dias estimados
                        </p>
                        <p className="text-2xl font-semibold text-[var(--cc-text-strong)]">
                          {formatDays(report.ageOfMoney.days)}
                        </p>
                      </div>
                      <div className="cc-card cc-stack-12">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                          Caixa disponível
                        </p>
                        <p className="text-2xl font-semibold text-[var(--cc-text-strong)]">
                          {fmtBRL(report.ageOfMoney.cashOnHand)}
                        </p>
                      </div>
                      <div className="cc-card cc-stack-12">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                          Média diária de gastos
                        </p>
                        <p className="text-2xl font-semibold text-[var(--cc-text-strong)]">
                          {fmtBRL(report.ageOfMoney.avgDailyOutflow)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--cc-text-muted)]">
                      {report.ageOfMoney.days
                        ? `Com o ritmo de gastos atual, suas reservas cobrem aproximadamente ${formatDays(
                            report.ageOfMoney.days
                          )} dias.`
                        : "Não há gastos suficientes no período para calcular a idade do dinheiro."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          !loading && (
            <p className="text-sm text-[var(--cc-text-muted)]">
              Nenhum dado disponível para os filtros selecionados.
            </p>
          )
        )}
      </div>
    </div>
  );
}
