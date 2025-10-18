"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtBRL } from "@/domain/format";
import { listCategories, listExpensesByMonth, type MonthFilter } from "@/domain/repo";

const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

export default function ExportPage() {
  const now = new Date();
  const [filter, setFilter] = useState<MonthFilter>({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof listCategories>>>([]);
  const [expenses, setExpenses] = useState<Awaited<ReturnType<typeof listExpensesByMonth>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { month, year } = filter;

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [cats, exps] = await Promise.all([
          listCategories(),
          listExpensesByMonth({ month, year })
        ]);

        if (!active) return;
        setCategories(cats);
        setExpenses(exps);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar os dados");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [month, year]);

  const csv = useMemo(() => {
    const head = ["id", "occurred_on", "amount_cents", "amount_brl", "category_name", "method", "description"];
    const categoryById = new Map(categories.map((cat) => [cat.id, cat]));
    const rows = expenses.map((expense) => {
      const category = expense.category_id ? categoryById.get(expense.category_id) : null;
      return [
        expense.id,
        expense.occurred_on,
        expense.amount_cents,
        fmtBRL(expense.amount_cents),
        category?.name ?? "",
        expense.method,
        (expense.description ?? "").replace(/[\r\n]+/g, " ")
      ];
    });

    return [head, ...rows]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }, [categories, expenses]);

  function handleDownload() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `contacerta-${filter.year}-${String(filter.month).padStart(2, "0")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="grid gap-6 md:grid-cols-12">
        <header className="md:col-span-12">
          <div className="cc-stack-24">
            <p className="cc-section-sub text-sm">
              Exporte as despesas do mês selecionado em um arquivo CSV para planilhas ou contabilidade.
            </p>
          </div>
        </header>

        <section className="cc-card cc-stack-24 p-4 md:col-span-12 md:p-6 lg:col-span-7">
          <form className="flex flex-col gap-4 md:flex-row md:items-end" aria-label="Filtros">
            <label className="cc-stack-24 text-sm" htmlFor="export-month">
              <span className="font-medium text-[var(--cc-text)]">Mês</span>
              <select
                id="export-month"
                className="h-11 rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                value={filter.month}
                onChange={(event) => setFilter({ ...filter, month: Number(event.target.value) })}
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
            </label>
            <label className="cc-stack-24 text-sm" htmlFor="export-year">
              <span className="font-medium text-[var(--cc-text)]">Ano</span>
              <input
                id="export-year"
                className="h-11 w-28 rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                type="number"
                inputMode="numeric"
                min={2000}
                max={9999}
                value={filter.year}
                onChange={(event) => setFilter({ ...filter, year: Number(event.target.value) })}
              />
            </label>
            <button
              type="button"
              className="h-11 rounded-md border px-4 text-sm font-medium md:ml-auto"
              style={{ borderColor: "var(--cc-border)" }}
              onClick={handleDownload}
              disabled={loading || !csv}
            >
              Baixar CSV
            </button>
          </form>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </section>

        <section className="cc-card p-4 md:col-span-12 md:p-6 lg:col-span-5">
          {loading ? (
            <p className="text-sm text-[var(--cc-text-muted)]">Carregando…</p>
          ) : error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : (
            <dl className="grid gap-4 text-sm">
              <div className="cc-stack-24">
                <dt className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--cc-text-muted)]">
                  Linhas exportadas
                </dt>
                <dd className="text-[22px] leading-[28px] font-semibold text-[var(--cc-text)]">
                  {expenses.length}
                </dd>
              </div>
              <div className="cc-stack-24">
                <dt className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--cc-text-muted)]">
                  Total em BRL
                </dt>
                <dd className="text-[22px] leading-[28px] font-semibold text-[var(--cc-text)]">
                  {fmtBRL(expenses.reduce((sum, exp) => sum + exp.amount_cents, 0))}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}
