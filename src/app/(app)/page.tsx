"use client";

import { useEffect, useMemo, useState } from "react";
import { ddmmyyyy, fmtBRL } from "@/domain/format";
import { listCategories, listExpensesByMonth, type MonthFilter } from "@/domain/repo";

type Category = Awaited<ReturnType<typeof listCategories>>[number];
type Expense = Awaited<ReturnType<typeof listExpensesByMonth>>[number];

function getCurrentYM(): MonthFilter {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function Page() {
  const [ym, setYM] = useState<MonthFilter>(getCurrentYM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { month, year } = ym;

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

  const total = useMemo(() => expenses.reduce((sum, item) => sum + (item?.amount_cents ?? 0), 0), [expenses]);
  const expensesWithCategory = useMemo(() => {
    const byId = new Map(categories.map((cat) => [cat.id, cat]));
    return expenses.map((expense) => ({
      ...expense,
      categoryName: expense.category_id ? byId.get(expense.category_id)?.name ?? "" : "",
      categoryColor: expense.category_id ? byId.get(expense.category_id)?.color ?? "" : ""
    }));
  }, [categories, expenses]);

  return (
    <div className="mx-auto max-w-[var(--cc-content-maxw)] p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <h1 className="text-2xl font-semibold">Resumo do mês</h1>
        <div className="md:ml-auto">
          <MonthPicker ym={ym} onChange={setYM} />
        </div>
      </div>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--cc-border)" }}>
          <p className="text-sm opacity-70">Total</p>
          <p className="text-2xl font-semibold" aria-live="polite">
            {fmtBRL(total)}
          </p>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--cc-border)" }}>
          <p className="text-sm opacity-70">Despesas registradas</p>
          <p className="text-2xl font-semibold" aria-live="polite">
            {expenses.length}
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Recentes</h2>
        {loading ? (
          <p className="mt-3 text-sm opacity-70">Carregando…</p>
        ) : error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : expensesWithCategory.length === 0 ? (
          <p className="mt-3 text-sm opacity-70">Sem despesas neste mês.</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-live="polite">
            {expensesWithCategory.slice(0, 20).map((expense) => (
              <li
                key={expense.id}
                className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                style={{ borderColor: "var(--cc-border)" }}
              >
                <div>
                  <div className="text-sm">
                    <span className="font-medium">{ddmmyyyy(expense.date)}</span>
                    <span className="opacity-70"> • {expense.method.toUpperCase()}</span>
                  </div>
                  {expense.description && (
                    <p className="text-sm opacity-80">{expense.description}</p>
                  )}
                  {expense.categoryName && (
                    <p className="text-xs opacity-70">
                      Categoria: <span style={{ color: expense.categoryColor }}>{expense.categoryName}</span>
                    </p>
                  )}
                </div>
                <div className="text-sm font-semibold md:text-base">{fmtBRL(expense.amount_cents)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <a
        href="/new"
        className="fixed bottom-4 right-4 grid h-12 w-12 place-items-center rounded-full border text-2xl"
        style={{ borderColor: "var(--cc-border)", background: "var(--cc-bg-elev)" }}
        aria-label="Registrar nova despesa"
      >
        +
      </a>
    </div>
  );
}

function MonthPicker({ ym, onChange }: { ym: MonthFilter; onChange: (value: MonthFilter) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs uppercase tracking-wide opacity-70" htmlFor="month-select">
        Mês
      </label>
      <select
        id="month-select"
        className="h-9 rounded-md border px-2 text-sm"
        style={{ borderColor: "var(--cc-border)" }}
        value={ym.month}
        onChange={(event) => onChange({ ...ym, month: Number(event.target.value) })}
      >
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
          <option key={month} value={month}>
            {month.toString().padStart(2, "0")}
          </option>
        ))}
      </select>
      <label className="text-xs uppercase tracking-wide opacity-70" htmlFor="year-input">
        Ano
      </label>
      <input
        id="year-input"
        className="h-9 w-24 rounded-md border px-2 text-sm"
        style={{ borderColor: "var(--cc-border)" }}
        type="number"
        inputMode="numeric"
        value={ym.year}
        onChange={(event) => onChange({ ...ym, year: Number(event.target.value) })}
        min={2000}
        max={9999}
      />
    </div>
  );
}
