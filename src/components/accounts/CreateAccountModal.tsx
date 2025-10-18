"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { createAccount } from "@/domain/repo";
import type { AccountInput } from "@/domain/models";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type AccountTypeOption = {
  id: string;
  label: string;
  description: string;
  type: AccountInput["type"];
  groupLabel: string;
};

type AccountTypeGroup = {
  id: string;
  label: string;
  helper: string;
  options: AccountTypeOption[];
};

const ACCOUNT_TYPE_GROUPS: AccountTypeGroup[] = [
  {
    id: "vista",
    label: "Contas à vista",
    helper: "Use para contas que você já possui e pode movimentar imediatamente.",
    options: [
      {
        id: "checking",
        label: "Conta-corrente",
        description: "Movimentações diárias com cartão de débito e PIX.",
        type: "checking",
        groupLabel: "Contas à vista",
      },
      {
        id: "savings",
        label: "Poupança",
        description: "Reservas com resgates rápidos e rendimento previsível.",
        type: "savings",
        groupLabel: "Contas à vista",
      },
      {
        id: "cash",
        label: "Dinheiro",
        description: "Notas físicas guardadas em casa ou na carteira.",
        type: "cash",
        groupLabel: "Contas à vista",
      },
    ],
  },
  {
    id: "credito",
    label: "Contas de crédito",
    helper: "Registre dívidas rotativas que exigem pagamento futuro.",
    options: [
      {
        id: "credit-card",
        label: "Cartão de crédito",
        description: "Compras parceladas ou à vista que geram fatura mensal.",
        type: "credit",
        groupLabel: "Contas de crédito",
      },
      {
        id: "line-of-credit",
        label: "Linha de crédito",
        description: "Limites pré-aprovados, como cheque especial ou crédito pessoal.",
        type: "credit",
        groupLabel: "Contas de crédito",
      },
    ],
  },
  {
    id: "emprestimos",
    label: "Financiamentos e empréstimos",
    helper: "Controle dívidas de longo prazo e seus saldos restantes.",
    options: [
      {
        id: "mortgage",
        label: "Hipoteca",
        description: "Financiamentos imobiliários com parcelas fixas ou indexadas.",
        type: "other",
        groupLabel: "Financiamentos e empréstimos",
      },
      {
        id: "auto-loan",
        label: "Financiamento de veículo",
        description: "Parcelas de carro, moto ou outros veículos motorizados.",
        type: "other",
        groupLabel: "Financiamentos e empréstimos",
      },
      {
        id: "student-loan",
        label: "Empréstimo estudantil",
        description: "Contratos para graduação, pós ou cursos técnicos.",
        type: "other",
        groupLabel: "Financiamentos e empréstimos",
      },
      {
        id: "personal-loan",
        label: "Empréstimo pessoal",
        description: "Dívidas sem garantia utilizadas para despesas gerais.",
        type: "other",
        groupLabel: "Financiamentos e empréstimos",
      },
      {
        id: "medical-debt",
        label: "Dívida médica",
        description: "Procedimentos de saúde pagos em parcelas ou renegociação.",
        type: "other",
        groupLabel: "Financiamentos e empréstimos",
      },
      {
        id: "other-loan",
        label: "Outro empréstimo",
        description: "Qualquer outra obrigação financeira parcelada.",
        type: "other",
        groupLabel: "Financiamentos e empréstimos",
      },
    ],
  },
  {
    id: "acompanhamento",
    label: "Contas de acompanhamento",
    helper: "Monitore patrimônios que não movimentam o orçamento mensal.",
    options: [
      {
        id: "asset",
        label: "Ativo (ex.: investimento)",
        description: "Aplicações, ações ou bens cujo saldo você deseja acompanhar.",
        type: "investment",
        groupLabel: "Contas de acompanhamento",
      },
      {
        id: "liability",
        label: "Passivo",
        description: "Obrigações fora do orçamento, como impostos futuros.",
        type: "other",
        groupLabel: "Contas de acompanhamento",
      },
    ],
  },
];

export type CreateAccountModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (account: { id: string; name: string }) => void;
};

export default function CreateAccountModal({ open, onClose, onCreated }: CreateAccountModalProps) {
  const [step, setStep] = useState<"form" | "type">("form");
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<AccountTypeOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("form");
      setName("");
      setSelectedType(null);
      setError(null);
      setIsSubmitting(false);
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

  const accountTypeLabel = selectedType ? selectedType.label : "Selecione o tipo de conta";

  const groups = useMemo(() => ACCOUNT_TYPE_GROUPS, []);

  const handleSelectType = useCallback((option: AccountTypeOption) => {
    setSelectedType(option);
    setStep("form");
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedType) {
        setError("Selecione um tipo de conta para continuar.");
        return;
      }

      if (!name.trim()) {
        setError("Informe um nome para identificar esta conta.");
        return;
      }

      try {
        setIsSubmitting(true);
        setError(null);
        const payload: AccountInput = {
          name: name.trim(),
          type: selectedType.type,
          group_label: selectedType.groupLabel,
        };
        const account = await createAccount(payload);
        setIsSubmitting(false);
        onCreated?.({ id: account.id, name: account.name });
        onClose();
      } catch (submissionError) {
        console.error(submissionError);
        setIsSubmitting(false);
        setError("Não foi possível criar a conta. Tente novamente.");
      }
    },
    [name, onClose, onCreated, selectedType],
  );

  if (!open) {
    return null;
  }

  if (step === "type") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-selecionar-tipo"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
        onClick={onClose}
      >
        <div
          className="flex w-full max-w-3xl flex-col gap-6 rounded-[var(--radius)] border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 text-[var(--cc-text)] shadow-[var(--shadow-2)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-[var(--cc-border)] p-2 text-[var(--cc-text-muted)] transition hover:text-[var(--cc-text)]"
              onClick={() => setStep("form")}
              aria-label="Voltar para o formulário"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 id="modal-selecionar-tipo" className="text-lg font-semibold">
                Escolha o tipo de conta
              </h2>
              <p className="text-sm text-[var(--cc-text-muted)]">
                Selecione a categoria que melhor representa esta conta. Você poderá editar depois se necessário.
              </p>
            </div>
          </div>

          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            {groups.map((group) => (
              <section key={group.id} className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--cc-text)]">{group.label}</h3>
                  <p className="text-xs text-[var(--cc-text-muted)]">{group.helper}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="flex h-full flex-col justify-between gap-2 rounded-2xl border border-[var(--cc-border)] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[var(--ring)] hover:shadow-md"
                      onClick={() => handleSelectType(option)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--cc-text)]">{option.label}</p>
                        <p className="text-xs text-[var(--cc-text-muted)]">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-criar-conta"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-lg flex-col gap-6 rounded-[var(--radius)] border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 text-[var(--cc-text)] shadow-[var(--shadow-2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-1">
          <h2 id="modal-criar-conta" className="text-lg font-semibold">
            Criar nova conta manualmente
          </h2>
          <p className="text-sm text-[var(--cc-text-muted)]">
            Dê um apelido para a conta e informe o tipo. Isso ajuda a organizar relatórios e grupos na barra lateral.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--cc-text)]" htmlFor="account-name">
            Nome da conta
            <input
              id="account-name"
              name="account-name"
              type="text"
              className="mt-2 w-full rounded-lg border border-[var(--cc-border)] bg-white px-3 py-2 text-sm text-[var(--cc-text)] shadow-sm focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Ex.: Conta salário"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </label>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-[var(--cc-text)]">Tipo de conta</span>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-[var(--cc-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--cc-text)] transition hover:border-[var(--ring)]"
              onClick={() => {
                setStep("type");
                setError(null);
              }}
            >
              {accountTypeLabel}
              <span className="text-xs font-medium text-[var(--cc-text-muted)]">Selecionar</span>
            </button>
            {selectedType && (
              <p className="text-xs text-[var(--cc-text-muted)]">
                Categoria: <strong>{selectedType.groupLabel}</strong>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="block text-sm font-medium text-[var(--cc-text)]">Saldo inicial (opcional)</span>
            <input
              type="text"
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-dashed border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-sm text-[var(--cc-text-muted)]"
              value={currencyFormatter.format(0)}
              readOnly
              aria-readonly="true"
            />
            <p className="text-xs text-[var(--cc-text-muted)]">
              Ajuste o saldo adicionando a primeira transação depois de criar a conta.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-[var(--cc-border)] px-4 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:border-[var(--ring)]"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--cc-accent)] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Criar conta"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

