"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";

type Payee = {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
};

type ManagePayeesModalProps = {
  open: boolean;
  payees: Payee[];
  onClose: () => void;
  onRename: (id: string, name: string) => Promise<Payee> | Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: (name: string) => Promise<Payee>;
};

type Feedback = { type: "success" | "error"; message: string } | null;

function normalize(text: string) {
  return text.trim().toLowerCase();
}

export function ManagePayeesModal({ open, payees, onClose, onRename, onDelete, onCreate }: ManagePayeesModalProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [createName, setCreateName] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedId(null);
      setEditName("");
      setCreateName("");
      setFeedback(null);
      setSaving(false);
      setCreating(false);
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const term = normalize(search);
    if (!term) return payees;
    return payees.filter((payee) => normalize(payee.name).includes(term));
  }, [payees, search]);

  useEffect(() => {
    if (!open) return;
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, open, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setEditName("");
      return;
    }
    const current = payees.find((payee) => payee.id === selectedId);
    setEditName(current?.name ?? "");
  }, [selectedId, payees]);

  if (!open) {
    return null;
  }

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) return;
    const next = editName.trim();
    if (!next) {
      setFeedback({ type: "error", message: "Informe um nome válido para o beneficiário." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await onRename(selectedId, next);
      setEditName(next);
      setFeedback({ type: "success", message: "Beneficiário atualizado com sucesso." });
    } catch (error: any) {
      setFeedback({ type: "error", message: error?.message ?? "Não foi possível atualizar." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const current = payees.find((payee) => payee.id === selectedId);
    const label = current?.name ?? "o beneficiário";
    const confirmation = window.confirm(`Remover ${label}? Transações existentes manterão o histórico.`);
    if (!confirmation) return;
    setSaving(true);
    setFeedback(null);
    try {
      await onDelete(selectedId);
      setFeedback({ type: "success", message: "Beneficiário removido." });
      setSelectedId(null);
      setEditName("");
    } catch (error: any) {
      setFeedback({ type: "error", message: error?.message ?? "Não foi possível remover." });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = createName.trim();
    if (!next) {
      setFeedback({ type: "error", message: "Informe um nome válido para criar um beneficiário." });
      return;
    }
    setCreating(true);
    setFeedback(null);
    try {
      const created = await onCreate(next);
      setFeedback({ type: "success", message: "Beneficiário criado com sucesso." });
      setCreateName("");
      setSelectedId(created.id);
    } catch (error: any) {
      setFeedback({ type: "error", message: error?.message ?? "Não foi possível criar." });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--cc-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--cc-text)]">Gerenciar beneficiários</h2>
            <p className="text-sm text-[var(--cc-text-muted)]">Centralize, renomeie ou arquive beneficiários usados nas suas transações.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--cc-border)] text-[var(--cc-text)] transition hover:bg-[var(--brand-soft-fill)]/40"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-[1.2fr,1fr]">
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]" htmlFor="manage-payees-search">
              Buscar beneficiários
            </label>
            <input
              id="manage-payees-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-2 h-10 rounded-xl border border-[var(--cc-border)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
              placeholder="Procure pelo nome"
            />
            <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-[var(--cc-border)] bg-[var(--brand-soft-fill)]/10">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--cc-text-muted)]">Nenhum beneficiário encontrado.</p>
              ) : (
                <ul role="list" className="divide-y divide-[var(--cc-border)]">
                  {filtered.map((payee) => {
                    const active = payee.id === selectedId;
                    return (
                      <li key={payee.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(payee.id);
                            setFeedback(null);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                            active
                              ? "bg-white font-semibold text-[var(--cc-text)]"
                              : "text-[var(--cc-text)] hover:bg-white/70"
                          }`}
                          aria-pressed={active}
                        >
                          <span>{payee.name}</span>
                          {payee.created_at ? (
                            <span className="text-xs text-[var(--cc-text-muted)]">
                              {new Date(payee.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-[var(--cc-border)] bg-[var(--brand-soft-fill)]/10 p-5">
              {selectedId ? (
                <form onSubmit={handleRename} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]" htmlFor="edit-payee-name">
                      Nome do beneficiário
                    </label>
                    <input
                      id="edit-payee-name"
                      type="text"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="mt-2 h-10 w-full rounded-xl border border-[var(--cc-border)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                      placeholder="Atualize o nome"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded-full bg-[var(--brand-soft-fill)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--cc-text)] shadow-sm transition hover:bg-[var(--brand-soft-fill)]/80 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={saving}
                    >
                      {saving ? "Salvando…" : "Salvar alterações"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={saving}
                    >
                      Remover
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-sm text-[var(--cc-text-muted)]">Selecione um beneficiário para editar ou remover.</div>
              )}
            </section>

            <section className="rounded-2xl border border-dashed border-[var(--cc-border)] bg-white p-5">
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]" htmlFor="create-payee-name">
                    Criar novo beneficiário
                  </label>
                  <input
                    id="create-payee-name"
                    type="text"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--cc-border)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                    placeholder="Digite o nome"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full border border-[var(--cc-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--cc-text)] transition hover:bg-[var(--brand-soft-fill)]/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={creating}
                >
                  {creating ? "Criando…" : "Criar beneficiário"}
                </button>
              </form>
            </section>

            {feedback ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  feedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManagePayeesModal;
