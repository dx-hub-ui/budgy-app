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
    description: ""
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
    <div className="mx-auto max-w-[var(--cc-content-maxw)] p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Nova despesa</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block text-sm">
          Valor (centavos)
          <input
            className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
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
        <label className="block text-sm">
          Data
          <input
            className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
            style={{ borderColor: "var(--cc-border)" }}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          Categoria
          <select
            className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
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
        <label className="block text-sm">
          Método
          <select
            className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
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
        <label className="block text-sm">
          Descrição
          <input
            className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
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
            className="h-9 rounded-md border px-4 text-sm"
            style={{ borderColor: "var(--cc-border)" }}
            type="submit"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
