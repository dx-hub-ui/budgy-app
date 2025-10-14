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
    const head = ["id", "date", "amount_cents", "amount_brl", "category_name", "method", "description"];
    const categoryById = new Map(categories.map((cat) => [cat.id, cat]));
    const rows = expenses.map((expense) => {
      const category = expense.category_id ? categoryById.get(expense.category_id) : null;
      return [
        expense.id,
        expense.date,
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
    <div className="mx-auto max-w-[var(--cc-content-maxw)] p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Exportar CSV</h1>
      <p className="mt-2 text-sm opacity-70">
        Exporte as despesas do mês selecionado em um arquivo CSV para planilhas ou contabilidade.
      </p>

      <form className="mt-4 flex flex-col gap-3 md:flex-row md:items-end" aria-label="Filtros">
        <label className="flex flex-col text-sm" htmlFor="export-month">
          <span className="mb-1 text-xs uppercase tracking-wide opacity-70">Mês</span>
          <select
            id="export-month"
            className="h-9 rounded-md border px-2 text-sm"
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
        <label className="flex flex-col text-sm" htmlFor="export-year">
          <span className="mb-1 text-xs uppercase tracking-wide opacity-70">Ano</span>
          <input
            id="export-year"
            className="h-9 w-28 rounded-md border px-2 text-sm"
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
          className="h-9 rounded-md border px-4 text-sm md:ml-auto"
          style={{ borderColor: "var(--cc-border)" }}
          onClick={handleDownload}
          disabled={loading || !csv}
        >
          Baixar CSV
        </button>
      </form>

      <section className="mt-6 rounded-lg border p-4" style={{ borderColor: "var(--cc-border)" }}>
        {loading ? (
          <p className="text-sm opacity-70">Carregando…</p>
        ) : error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : (
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="opacity-70">Linhas exportadas</dt>
              <dd className="font-semibold">{expenses.length}</dd>
            </div>
            <div>
              <dt className="opacity-70">Total em BRL</dt>
              <dd className="font-semibold">{fmtBRL(expenses.reduce((sum, exp) => sum + exp.amount_cents, 0))}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
