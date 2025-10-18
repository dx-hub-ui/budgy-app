"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ymd } from "@/domain/format";

type CategoryOption = { id: string; name: string };

export type AccountTransaction = {
  id: string;
  date: string;
  description: string | null;
  categoryName: string | null;
  memo: string | null;
  outflowCents: number;
  inflowCents: number;
};

type CreatePayload = {
  date: string;
  description: string;
  categoryId: string | null;
  memo: string;
  outflowCents: number;
  inflowCents: number;
  repeat: string;
};

export type CreateTransactionPayload = CreatePayload;

type Props = {
  categories: CategoryOption[];
  transactions: AccountTransaction[];
  loading: boolean;
  onCreate: (payload: CreatePayload) => Promise<void>;
  focusSignal?: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return dateFormatter.format(parsed);
}

function formatCurrency(valueCents: number) {
  if (!Number.isFinite(valueCents) || valueCents === 0) {
    return "";
  }
  return currencyFormatter.format(valueCents / 100);
}

export default function AccountTransactionsTable({
  categories,
  transactions,
  loading,
  onCreate,
  focusSignal,
}: Props) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payeeInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    date: ymd(new Date()),
    description: "",
    categoryId: "",
    memo: "",
    outflow: "",
    inflow: "",
    repeat: "never",
  });

  useEffect(() => {
    if (typeof focusSignal === "number") {
      payeeInputRef.current?.focus();
    }
  }, [focusSignal]);

  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const term = search.toLowerCase();
    return transactions.filter((transaction) => {
      return (
        transaction.description?.toLowerCase().includes(term) ||
        transaction.categoryName?.toLowerCase().includes(term) ||
        transaction.memo?.toLowerCase().includes(term)
      );
    });
  }, [transactions, search]);

  async function handleSave() {
    const outflowCents = Math.round(Number.parseFloat(form.outflow.replace(/\./g, "").replace(",", ".")) * 100) || 0;
    const inflowCents = Math.round(Number.parseFloat(form.inflow.replace(/\./g, "").replace(",", ".")) * 100) || 0;

    if (!form.description || form.description.trim().length === 0) {
      setError("Informe um beneficiário ou descrição.");
      return;
    }

    if (outflowCents === 0 && inflowCents === 0) {
      setError("Preencha um valor em saída ou entrada.");
      return;
    }

    if (outflowCents > 0 && inflowCents > 0) {
      setError("Use apenas saída ou entrada por vez.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onCreate({
        date: form.date,
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        memo: form.memo.trim(),
        outflowCents,
        inflowCents,
        repeat: form.repeat,
      });
      setForm({
        date: ymd(new Date()),
        description: "",
        categoryId: "",
        memo: "",
        outflow: "",
        inflow: "",
        repeat: "never",
      });
    } catch (err: any) {
      setError(err.message ?? "Não foi possível salvar a transação");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 rounded-3xl border border-[var(--cc-border)] bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-[var(--cc-text)]">Lançamentos recentes</div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <input
            type="search"
            className="h-10 flex-1 rounded-xl border border-[var(--cc-border)] px-3 text-sm"
            placeholder="Buscar por descrição ou categoria"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="text-xs text-[var(--cc-text-muted)]">{filteredTransactions.length} itens</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--cc-border)] bg-white">
        <table className="min-w-full divide-y divide-[var(--cc-border)]">
          <thead className="bg-[var(--brand-soft-fill)]/40 text-[var(--cc-text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Data</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Beneficiário</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Categoria</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Memo</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Saída</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Entrada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cc-border)]">
            <tr className="bg-[var(--brand-soft-fill)]/20">
              <td className="px-4 py-2 text-sm">
                <input
                  type="date"
                  className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    className="h-9 flex-1 rounded-lg border border-[var(--cc-border)] px-2 text-sm"
                    placeholder="Quem recebeu?"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    ref={payeeInputRef}
                  />
                  <button
                    type="button"
                    className="whitespace-nowrap rounded-full border border-[var(--cc-border)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]"
                    onClick={() => setForm((prev) => ({ ...prev, repeat: prev.repeat === "never" ? "monthly" : "never" }))}
                  >
                    Repetição: {form.repeat === "never" ? "Nunca" : form.repeat === "monthly" ? "Mensal" : form.repeat}
                  </button>
                </div>
              </td>
              <td className="px-4 py-2">
                <select
                  className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm"
                  value={form.categoryId}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm"
                  placeholder="Notas adicionais"
                  value={form.memo}
                  onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm text-right"
                  placeholder="0,00"
                  value={form.outflow}
                  onChange={(event) => setForm((prev) => ({ ...prev, outflow: event.target.value }))}
                />
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm text-right"
                    placeholder="0,00"
                    value={form.inflow}
                    onChange={(event) => setForm((prev) => ({ ...prev, inflow: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="h-9 rounded-lg bg-[var(--cc-accent)] px-3 text-sm font-semibold text-slate-900 transition hover:brightness-95"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </td>
            </tr>
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-2 text-sm text-rose-600">
                  {error}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--cc-text-muted)]">
                  Carregando transações…
                </td>
              </tr>
            )}
            {!loading && filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--cc-text-muted)]">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-[var(--brand-soft-fill)]/15">
                  <td className="px-4 py-3 text-sm text-[var(--cc-text)]">{formatDate(transaction.date)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--cc-text)]">{transaction.description || "(Sem descrição)"}</td>
                  <td className="px-4 py-3 text-sm text-[var(--cc-text)]">{transaction.categoryName ?? "Sem categoria"}</td>
                  <td className="px-4 py-3 text-sm text-[var(--cc-text-muted)]">{transaction.memo ?? ""}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-rose-600">
                    {formatCurrency(transaction.outflowCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600">
                    {formatCurrency(transaction.inflowCents)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
