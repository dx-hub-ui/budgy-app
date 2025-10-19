"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

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

const tabs: Array<{ id: TabId; label: string; description: string }> = [
  { id: "breakdown", label: "Distribuição", description: "Categorias com maior peso nos gastos" },
  { id: "trends", label: "Tendências", description: "Evolução mensal consolidada" },
  { id: "net", label: "Patrimônio", description: "Contas e saldos consolidados" },
  { id: "income", label: "Receita vs. despesa", description: "Entrada, saída e saldo" },
  { id: "age", label: "Idade do dinheiro", description: "Sustentação do caixa" }
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

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto px-6 pb-10 pt-8 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-10">
          <section aria-label="Filtros do relatório" className="flex flex-wrap items-end gap-6">
            <div className="flex min-w-[160px] flex-col gap-2">
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

            <div className="flex min-w-[220px] flex-col gap-2">
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

            <div className="flex min-w-[220px] flex-col gap-2">
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
          </section>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {loading && (
            <div
              className="h-32 animate-pulse rounded-2xl border border-dashed border-[var(--cc-border)] bg-[color-mix(in_oklab,var(--cc-surface) 94%,white)]"
              aria-live="polite"
            >
              <span className="sr-only">Carregando relatório</span>
            </div>
          )}

          {report ? (
            <section className="flex flex-col gap-8">
              <nav className="border-b border-[var(--cc-border)]" aria-label="Seções do relatório" role="tablist">
                <div className="flex flex-wrap gap-6">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const tabButtonId = `report-tab-${tab.id}`;
                    return (
                      <button
                        key={tab.id}
                        id={tabButtonId}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls="report-tabpanel"
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--cc-bg)] ${
                          isActive
                            ? "text-[var(--cc-text-strong)]"
                            : "text-[var(--cc-text-muted)] hover:text-[var(--cc-text-strong)]"
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`absolute inset-x-0 bottom-0 h-0.5 transition-opacity ${
                            isActive
                              ? "bg-[var(--brand)] opacity-100"
                              : "bg-[var(--cc-border)] opacity-0"
                          }`}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>
              </nav>

              {activeTabMeta && (
                <p className="text-sm text-[var(--cc-text-muted)]">{activeTabMeta.description}</p>
              )}

              <div role="tabpanel" id="report-tabpanel" aria-labelledby={activeTab ? `report-tab-${activeTab}` : undefined}>
                {activeTab === "breakdown" && (
                  <div className="grid gap-10 lg:grid-cols-12">
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
                          <li key={item.id ?? item.name} className="rounded-xl border border-[var(--cc-border)] bg-white/60 p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between text-sm font-medium">
                              <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                {item.name}
                              </span>
                              <span>{fmtBRL(item.amount)}</span>
                            </div>
                            <div className="mt-3 h-2 w-full rounded-full bg-[var(--cc-border)]">
                              <span
                                className="block h-2 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(4, item.percentage * 100))}%`,
                                  backgroundColor: item.color
                                }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-[var(--cc-text-muted)]">
                              {formatPercentage(item.percentage)} do total do mês.
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === "trends" && (
                  <div className="flex flex-col gap-6">
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
                  <div className="grid gap-10 lg:grid-cols-12">
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
                        <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-[var(--cc-border)] bg-white/60 backdrop-blur-sm">
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
                  <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--cc-text-strong)]">Receitas x Despesas</h2>
                      <p className="text-sm text-[var(--cc-text-muted)]">
                        Balanceamento entre entradas e saídas no mês selecionado.
                      </p>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[var(--cc-border)] bg-white/60 backdrop-blur-sm">
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
                  <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--cc-text-strong)]">Idade do dinheiro</h2>
                      <p className="text-sm text-[var(--cc-text-muted)]">
                        Estimativa de quantos dias suas reservas atuais sustentam o nível de gastos do mês.
                      </p>
                    </div>
                    <dl className="grid gap-6 md:grid-cols-3">
                      <div className="rounded-xl border border-[var(--cc-border)] bg-white/60 p-5 text-[var(--cc-text-strong)] backdrop-blur-sm">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                          Dias estimados
                        </dt>
                        <dd className="mt-2 text-2xl font-semibold">{formatDays(report.ageOfMoney.days)}</dd>
                      </div>
                      <div className="rounded-xl border border-[var(--cc-border)] bg-white/60 p-5 text-[var(--cc-text-strong)] backdrop-blur-sm">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                          Caixa disponível
                        </dt>
                        <dd className="mt-2 text-2xl font-semibold">{fmtBRL(report.ageOfMoney.cashOnHand)}</dd>
                      </div>
                      <div className="rounded-xl border border-[var(--cc-border)] bg-white/60 p-5 text-[var(--cc-text-strong)] backdrop-blur-sm">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                          Média diária de gastos
                        </dt>
                        <dd className="mt-2 text-2xl font-semibold">{fmtBRL(report.ageOfMoney.avgDailyOutflow)}</dd>
                      </div>
                    </dl>
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
          ) : (
            !loading && (
              <p className="text-sm text-[var(--cc-text-muted)]">
                Nenhum dado disponível para os filtros selecionados.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
