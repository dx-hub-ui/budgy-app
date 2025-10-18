"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AccountSchema } from "@/domain/models";
import { createAccount } from "@/domain/repo";

const accountTypes = [
  { value: "checking", label: "Conta corrente" },
  { value: "cash", label: "Dinheiro" },
  { value: "credit", label: "Cartão de crédito" },
  { value: "savings", label: "Poupança" },
  { value: "investment", label: "Investimento" },
  { value: "other", label: "Outro" },
];

const methods = [
  { value: "debito", label: "Débito" },
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Crédito" },
];

export default function NewAccountPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    type: "checking",
    group_label: "Contas bancárias",
    default_method: "debito",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = AccountSchema.safeParse(form);
    if (!parsed.success) {
      setError("Revise os dados informados antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      await createAccount(parsed.data);
      router.replace("/contas");
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível criar a conta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-auto bg-[var(--cc-bg)]">
      <div className="mx-auto w-full max-w-[640px] px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--cc-text)]">Nova conta</h1>
          <p className="mt-2 text-sm text-[var(--cc-text-muted)]">
            Cadastre uma conta para acompanhar saldos e registrar transações conectadas ao seu orçamento.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-[var(--cc-border)] bg-white/90 p-6 shadow">
          <label className="block text-sm font-medium text-[var(--cc-text)]">
            Nome da conta
            <input
              type="text"
              className="mt-2 h-11 w-full rounded-xl border border-[var(--cc-border)] px-3 text-sm"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              maxLength={80}
              required
            />
          </label>

          <label className="block text-sm font-medium text-[var(--cc-text)]">
            Agrupamento
            <input
              type="text"
              className="mt-2 h-11 w-full rounded-xl border border-[var(--cc-border)] px-3 text-sm"
              value={form.group_label}
              onChange={(event) => setForm((prev) => ({ ...prev, group_label: event.target.value }))}
              maxLength={80}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--cc-text)]">
              Tipo
              <select
                className="mt-2 h-11 w-full rounded-xl border border-[var(--cc-border)] px-3 text-sm"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                {accountTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-[var(--cc-text)]">
              Método padrão
              <select
                className="mt-2 h-11 w-full rounded-xl border border-[var(--cc-border)] px-3 text-sm"
                value={form.default_method}
                onChange={(event) => setForm((prev) => ({ ...prev, default_method: event.target.value }))}
              >
                {methods.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="h-11 rounded-xl bg-[var(--cc-accent)] px-6 text-sm font-semibold text-slate-900 transition hover:brightness-95"
              disabled={saving}
            >
              {saving ? "Salvando…" : "Criar conta"}
            </button>
            <button
              type="button"
              className="h-11 rounded-xl border border-[var(--cc-border)] px-6 text-sm font-semibold text-[var(--cc-text)]"
              onClick={() => router.back()}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
