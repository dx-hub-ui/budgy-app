"use client";

import Link from "next/link";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) {
    return "R$ 0,00";
  }
  return currencyFormatter.format(value / 100);
}

export type SidebarAccount = {
  id: string;
  name: string;
  href: string;
  balanceCents: number;
  isActive: boolean;
};

export type SidebarGroup = {
  id: string;
  label: string;
  accounts: SidebarAccount[];
};

type Props = {
  planName: string;
  contact: string | null;
  totalBalanceCents: number;
  groups: SidebarGroup[];
};

export default function AccountSidebar({ planName, contact, totalBalanceCents, groups }: Props) {
  return (
    <aside className="hidden h-full w-[260px] shrink-0 flex-col gap-8 border-r border-[var(--cc-border)] bg-white px-4 py-6 lg:flex xl:w-[280px]">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">Plano</p>
          <p className="mt-1 text-sm font-semibold text-[var(--cc-text)]">{planName}</p>
          {contact && <p className="text-xs text-[var(--cc-text-muted)]">{contact}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">Saldo total</p>
          <p className="text-xl font-semibold text-[var(--cc-text)]">{formatCurrency(totalBalanceCents)}</p>
        </div>
      </div>

      <nav aria-label="Contas" className="flex-1 overflow-y-auto pr-1">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.id} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                {group.label}
              </p>
              <ul className="space-y-2">
                {group.accounts.map((account) => (
                  <li key={account.id}>
                    <Link
                      href={account.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        account.isActive
                          ? "bg-[var(--brand-soft-fill)] text-[var(--cc-text)] font-semibold"
                          : "text-[var(--cc-text-muted)] hover:bg-[var(--brand-soft-fill)]/60 hover:text-[var(--cc-text)]"
                      }`}
                      aria-current={account.isActive ? "page" : undefined}
                    >
                      <span className="font-medium">{account.name}</span>
                      <span className="text-xs font-semibold">
                        {formatCurrency(account.balanceCents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div>
        <Link
          href="/contas/nova"
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[var(--cc-accent)] text-sm font-semibold text-slate-900 transition hover:brightness-95"
        >
          Adicionar conta
        </Link>
      </div>
    </aside>
  );
}
