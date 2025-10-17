"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createExpense, listAccounts, listCategories } from "@/domain/repo";
import { ExpenseSchema } from "@/domain/models";
import { ymd } from "@/domain/format";

export default function NewExpensePage() {
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount_cents: 0,
    date: ymd(new Date()),
    category_id: null as string | null,
    account_id: null as string | null,
    method: "pix",
    description: "",
    memo: "",
  });

  useEffect(() => {
    let active = true;
    setLoadingCats(true);
    setLoadingAccounts(true);
    Promise.all([listCategories(), listAccounts()])
      .then(([catsData, accountsData]) => {
        if (!active) return;
        setCats(catsData);
        setAccounts(accountsData);
        setForm((prev) => ({
          ...prev,
          account_id: prev.account_id ?? accountsData[0]?.id ?? null,
        }));
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message ?? "Falha ao carregar dados auxiliares");
      })
      .finally(() => {
        if (!active) return;
        setLoadingCats(false);
        setLoadingAccounts(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = ExpenseSchema.safeParse({ ...form, direction: "outflow" });
    if (!parsed.success) {
      alert("Dados inválidos");
      return;
    }
    try {
      setError(null);
      await createExpense(parsed.data);
      router.push("/");
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar despesa");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="grid gap-6 md:grid-cols-12">
        <header className="md:col-span-12">
          <div className="cc-stack-24">
            <p className="cc-section-sub text-sm">Cadastre um novo lançamento financeiro.</p>
          </div>
        </header>

        <section className="cc-card p-4 md:col-span-12 md:p-6 lg:col-span-6">
          <form onSubmit={onSubmit} className="cc-stack-24">
            <label className="cc-stack-24 text-sm">
              <span className="font-medium text-[var(--cc-text)]">Valor (centavos)</span>
              <input
                className="h-11 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                type="number"
                min={1}
                step={1}
                value={form.amount_cents}
                onChange={(e) =>
                  setForm({ ...form, amount_cents: Number.parseInt(e.target.value || "0", 10) })
                }
                required
              />
            </label>
            <label className="cc-stack-24 text-sm">
              <span className="font-medium text-[var(--cc-text)]">Data</span>
              <input
                className="h-11 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label className="cc-stack-24 text-sm">
              <span className="font-medium text-[var(--cc-text)]">Categoria</span>
              <select
                className="h-11 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                value={form.category_id ?? ""}
                onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                disabled={loadingCats && cats.length === 0}
              >
                <option value="">Sem categoria</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="cc-stack-24 text-sm">
              <span className="font-medium text-[var(--cc-text)]">Conta</span>
              <select
                className="h-11 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                value={form.account_id ?? ""}
                onChange={(e) => setForm({ ...form, account_id: e.target.value || null })}
                disabled={loadingAccounts && accounts.length === 0}
                required
              >
                <option value="" disabled>
                  Selecione uma conta
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="cc-stack-24 text-sm">
              <span className="font-medium text-[var(--cc-text)]">Método</span>
              <select
                className="h-11 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value as any })}
              >
                <option value="pix">Pix</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </label>
            <label className="cc-stack-24 text-sm">
              <span className="font-medium text-[var(--cc-text)]">Descrição</span>
              <input
                className="h-11 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={140}
              />
            </label>
            <label className="cc-stack-24 text-sm">
              <span className="font-medium text-[var(--cc-text)]">Memo</span>
              <input
                className="h-11 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                value={form.memo || ""}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                maxLength={280}
                placeholder="Observações adicionais (opcional)"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="pt-2">
              <button
                className="h-11 rounded-md border px-4 text-sm font-medium"
                style={{ borderColor: "var(--cc-border)" }}
                type="submit"
              >
                Salvar
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
