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
    <div className="mx-auto max-w-[var(--cc-content-maxw)] p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Categorias</h1>
      <form onSubmit={add} className="mt-4 flex flex-col gap-2 md:flex-row">
        <input
          className="h-9 w-full rounded-md border px-3 text-sm"
          style={{ borderColor: "var(--cc-border)" }}
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="h-9 w-full rounded-md border px-2 text-sm md:w-28"
          style={{ borderColor: "var(--cc-border)" }}
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Cor"
        />
        <button
          className="h-9 rounded-md border px-4 text-sm"
          style={{ borderColor: "var(--cc-border)" }}
          type="submit"
        >
          Adicionar
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {loading ? (
          <li className="text-sm opacity-80">Carregando…</li>
        ) : items.length === 0 ? (
          <li className="text-sm opacity-80">Sem categorias.</li>
        ) : (
          items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border p-3"
              style={{ borderColor: "var(--cc-border)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded"
                  style={{ background: c.color }}
                  aria-hidden
                />
                <span className="text-sm">{c.name}</span>
              </div>
              <button
                className="text-sm opacity-80 hover:opacity-100"
                type="button"
                onClick={() => handleDelete(c.id)}
              >
                Excluir
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
