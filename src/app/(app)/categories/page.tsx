"use client";

import { useEffect, useState } from "react";
import { listCategories, upsertCategory, deleteCategory } from "@/domain/repo";

export default function CategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6ea8fe");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const data = await listCategories();
      setItems(data);
    } catch (err: any) {
      setError(err.message ?? "Falha ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await upsertCategory({ name, color });
      setName("");
      setColor("#6ea8fe");
      await refresh();
    } catch (err: any) {
      alert(err.message ?? "Erro ao salvar categoria");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir categoria?")) return;
    try {
      await deleteCategory(id);
      await refresh();
    } catch (err: any) {
      alert(err.message ?? "Erro ao excluir categoria");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)]">
      <div className="grid gap-6 md:grid-cols-12">
        <header className="md:col-span-12">
          <div className="cc-stack-24">
            <h1 className="text-[28px] leading-[36px] font-semibold">Categorias</h1>
            <p className="cc-section-sub text-sm">
              Gerencie os grupos para organizar seus gastos.
            </p>
          </div>
        </header>

        <section className="cc-card cc-stack-24 p-4 md:col-span-12 md:p-6 lg:col-span-6">
          <form onSubmit={add} className="flex flex-col gap-3 md:flex-row">
            <input
              className="h-10 w-full rounded-md border px-3 text-sm"
              style={{ borderColor: "var(--cc-border)" }}
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="h-10 w-full rounded-md border px-2 text-sm md:w-28"
              style={{ borderColor: "var(--cc-border)" }}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Cor"
            />
            <button
              className="h-10 rounded-md border px-4 text-sm font-medium"
              style={{ borderColor: "var(--cc-border)" }}
              type="submit"
            >
              Adicionar
            </button>
          </form>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </section>

        <section className="cc-card p-4 md:col-span-12 md:p-6">
          <h2 className="text-[15px] leading-[22px] font-semibold">Categorias registradas</h2>
          <ul className="cc-stack-24 pt-4 md:pt-5">
            {loading ? (
              <li className="text-sm text-[var(--cc-text-muted)]">Carregando…</li>
            ) : items.length === 0 ? (
              <li className="text-sm text-[var(--cc-text-muted)]">Sem categorias.</li>
            ) : (
              items.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--cc-border)" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded"
                      style={{ background: c.color }}
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-[var(--cc-text)]">{c.name}</span>
                  </div>
                  <button
                    className="text-sm font-medium text-[var(--cc-text-muted)] transition hover:text-[var(--cc-text)]"
                    type="button"
                    onClick={() => handleDelete(c.id)}
                  >
                    Excluir
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
