"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
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

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "breakdown", label: "Resumo de gastos" },
  { id: "trends", label: "Tendências" },
  { id: "net", label: "Patrimônio" },
  { id: "income", label: "Receitas x Despesas" },
  { id: "age", label: "Idade do dinheiro" }
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
          ...categories.map((category) => ({ value: category.id, label: category.name }))
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

  const netBadgeTone = useMemo(() => {
    if (!report) return "info" as const;
    if (report.incomeExpense.net === 0) return "info" as const;
    return report.incomeExpense.net > 0 ? ("success" as const) : ("danger" as const);
  }, [report]);

  const netWorthTone = useMemo(() => {
    if (!report) return "info" as const;
    if (report.netWorth.net === 0) return "info" as const;
    return report.netWorth.net > 0 ? ("success" as const) : ("danger" as const);
  }, [report]);

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="grid gap-6 md:grid-cols-12">
        <header className="md:col-span-12">
          <div className="cc-stack-24">
            <h1 className="text-2xl font-semibold text-[var(--cc-text-strong)]">Relatórios</h1>
            <p className="cc-section-sub text-sm text-[var(--cc-text-muted)]">
              Acompanhe indicadores chave do seu orçamento, analise tendências e identifique oportunidades de
              ajustes.
            </p>
          </div>
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
          <p className="md:col-span-12 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="md:col-span-12 text-sm text-[var(--cc-text-muted)]">Carregando indicadores…</p>
        ) : report ? (
          <>
            <section className="md:col-span-12">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="cc-card cc-stack-12">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                    Total gasto no período
                  </p>
                  <p className="text-2xl font-semibold text-[var(--cc-text-strong)]">
                    {fmtBRL(report.totalSpending)}
                  </p>
                  <p className="text-xs text-[var(--cc-text-muted)]">
                    Soma das saídas considerando os filtros selecionados.
                  </p>
                </div>
                <div className="cc-card cc-stack-12">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                      Receita menos despesa
                    </p>
                    <Badge tone={netBadgeTone}>{fmtBRL(report.incomeExpense.net)}</Badge>
                  </div>
                  <p className="text-xs text-[var(--cc-text-muted)]">
                    Receitas totais: <strong>{fmtBRL(report.incomeExpense.income)}</strong>
                  </p>
                  <p className="text-xs text-[var(--cc-text-muted)]">
                    Despesas totais: <strong>{fmtBRL(report.incomeExpense.expense)}</strong>
                  </p>
                </div>
                <div className="cc-card cc-stack-12">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                      Patrimônio líquido estimado
                    </p>
                    <Badge tone={netWorthTone}>{fmtBRL(report.netWorth.net)}</Badge>
                  </div>
                  <p className="text-xs text-[var(--cc-text-muted)]">
                    Ativos: <strong>{fmtBRL(report.netWorth.assets)}</strong>
                  </p>
                  <p className="text-xs text-[var(--cc-text-muted)]">
                    Dívidas: <strong>{fmtBRL(Math.abs(report.netWorth.debts))}</strong>
                  </p>
                </div>
              </div>
            </section>

            <section className="md:col-span-12">
              <div className="flex flex-wrap gap-2 border-b border-[var(--cc-border)]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-white text-[var(--cc-text-strong)] shadow"
                        : "text-[var(--cc-text-muted)] hover:text-[var(--cc-text-strong)]"
                    }`}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="cc-card rounded-t-none">
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
                                className="block h-2 rounded-full bg-[var(--primary-500)]"
                                style={{
                                  width: `${Math.min(100, Math.max(4, item.percentage * 100))}%`
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
          </>
        ) : (
          <p className="md:col-span-12 text-sm text-[var(--cc-text-muted)]">
            Nenhum dado disponível para os filtros selecionados.
          </p>
        )}
      </div>
    </div>
  );
}
