"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createExpense, listCategories } from "@/domain/repo";
import { ExpenseSchema } from "@/domain/models";
import { ymd } from "@/domain/format";

export default function NewExpensePage() {
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount_cents: 0,
    date: ymd(new Date()),
    category_id: null as string | null,
    method: "pix",
    description: "",
  });

  useEffect(() => {
    let active = true;
    setLoadingCats(true);
    listCategories()
      .then((data) => {
        if (!active) return;
        setCats(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message ?? "Falha ao carregar categorias");
      })
      .finally(() => {
        if (!active) return;
        setLoadingCats(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = ExpenseSchema.safeParse(form);
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
