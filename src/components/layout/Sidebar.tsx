"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PiggyBank,
  Receipt,
  FileDown,
  Wallet2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  type LucideIcon
} from "lucide-react";

import IconButton from "@/components/ui/IconButton";
import Tooltip from "@/components/ui/Tooltip";
import { SidebarUserMenu } from "./UserMenu";
import { mesAtual } from "@/domain/budgeting";
import { listAccounts, listExpenses } from "@/domain/repo";
import CreateAccountModal from "@/components/accounts/CreateAccountModal";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Props = { collapsed: boolean; onToggle: () => void };

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: (pathname: string) => boolean;
};

type SidebarAccount = {
  id: string;
  name: string;
  balanceCents: number;
  groupLabel: string;
};

function sanitizeStoredAccountId(accountId: string | null | undefined) {
  if (!accountId) return null;
  const trimmed = accountId.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return null;
  }
  if (/[^a-zA-Z0-9-]/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function resolveStoredAccountHref(accountId: string | null | undefined) {
  const sanitized = sanitizeStoredAccountId(accountId);
  if (!sanitized) {
    return "/contas";
  }
  return `/contas/${sanitized}`;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const currentMonth = mesAtual();
  const [accountsHref, setAccountsHref] = useState<string>("/contas");
  const [accounts, setAccounts] = useState<SidebarAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountsExpanded, setAccountsExpanded] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyStoredAccount = () => {
      const stored = window.localStorage.getItem("cc_last_account");
      setAccountsHref(resolveStoredAccountHref(stored));
    };

    applyStoredAccount();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "cc_last_account") {
        setAccountsHref(resolveStoredAccountHref(event.newValue));
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) {
      return;
    }

    if (pathname.startsWith("/contas/")) {
      const [, , accountId] = pathname.split("/");
      if (accountId && accountId !== "nova") {
        window.localStorage.setItem("cc_last_account", accountId);
        setAccountsHref(`/contas/${accountId}`);
        return;
      }

      if (accountId === "nova") {
        const stored = window.localStorage.getItem("cc_last_account");
        setAccountsHref(resolveStoredAccountHref(stored));
        return;
      }
    }

    if (pathname === "/contas") {
      const stored = window.localStorage.getItem("cc_last_account");
      setAccountsHref(resolveStoredAccountHref(stored));
    }
  }, [pathname]);

  const items: SidebarItem[] = useMemo(
    () => [
      {
        href: `/budgets/${currentMonth}`,
        label: "Orçamento",
        icon: PiggyBank,
        isActive: (path) => path.startsWith("/budgets")
      }
    ],
    [currentMonth]
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [],
  );

  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      setAccountsError(null);
      const [accountRows, expenseRows] = await Promise.all([listAccounts(), listExpenses()]);
      const totals = new Map<string, number>();
      expenseRows.forEach((expense) => {
        const accountId = expense.account_id ?? "sem-conta";
        const direction = expense.direction === "inflow" ? 1 : -1;
        const amount = Number.isFinite(expense.amount_cents) ? expense.amount_cents : 0;
        totals.set(accountId, (totals.get(accountId) ?? 0) + direction * amount);
      });
      const summaries: SidebarAccount[] = accountRows.map((account) => ({
        id: account.id,
        name: account.name,
        groupLabel: account.group_label ?? "Outras contas",
        balanceCents: totals.get(account.id) ?? 0,
      }));
      setAccounts(summaries);

      if (typeof window !== "undefined") {
        const stored = sanitizeStoredAccountId(window.localStorage.getItem("cc_last_account"));
        const hasStored = stored ? summaries.some((account) => account.id === stored) : false;

        if (!hasStored) {
          if (stored) {
            window.localStorage.removeItem("cc_last_account");
          }
          const fallback = summaries[0]?.id ?? null;
          setAccountsHref(fallback ? `/contas/${fallback}` : "/contas");
        }
      }
    } catch (error) {
      console.error(error);
      setAccountsError("Não foi possível carregar as contas.");
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const accountsByGroup = useMemo(() => {
    const grouped = new Map<string, { label: string; accounts: SidebarAccount[] }>();
    accounts.forEach((account) => {
      const key = account.groupLabel;
      const entry = grouped.get(key);
      if (entry) {
        entry.accounts.push(account);
      } else {
        grouped.set(key, { label: key, accounts: [account] });
      }
    });
    return Array.from(grouped.values());
  }, [accounts]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balanceCents, 0),
    [accounts],
  );

  const currentAccountId = useMemo(() => {
    if (!pathname?.startsWith("/contas/")) return null;
    const [, , accountId] = pathname.split("/");
    return accountId ?? null;
  }, [pathname]);

  useEffect(() => {
    if (pathname?.startsWith("/contas")) {
      setAccountsExpanded(true);
    }
  }, [pathname]);

  const toggleAccountsExpanded = useCallback(() => {
    setAccountsExpanded((prev) => !prev);
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const isAccountsActive = pathname?.startsWith("/contas");

  const handleAccountCreated = useCallback(
    async (account: { id: string; name: string }) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cc_last_account", account.id);
        setAccountsHref(`/contas/${account.id}`);
      }
      await fetchAccounts();
      router.push(`/contas/${account.id}`);
      setIsModalOpen(false);
    },
    [fetchAccounts, router],
  );

  const headerClass = cn(
    "border-b px-3 py-4",
    collapsed ? "flex flex-col items-center gap-3" : "flex flex-col gap-3"
  );

  return (
    <nav id="sidebar" className="cc-sidebar cc-sidebar--light" aria-label="Menu principal">
      <div className="flex h-full flex-col">
        <div className={headerClass} style={{ borderColor: "var(--sidebar-border)" }}>
          <Link
            href="/"
            className={cn(
              "flex items-center justify-center rounded-2xl bg-white/10",
              collapsed ? "h-11 w-11" : "h-10 w-10"
            )}
            aria-label="Ir para a página inicial"
          >
            <Image src="/brand/favicon.png" alt="Budgy" width={24} height={24} className="h-6 w-6" priority />
          </Link>
          <SidebarUserMenu collapsed={collapsed} />
        </div>

        <ul className="flex-1 overflow-y-auto py-4">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = it.isActive ? it.isActive(pathname ?? "") : pathname?.startsWith(it.href);
            return (
              <li key={it.href} className="px-2">
                <Link
                  href={it.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "cc-nav-item group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]",
                    isActive
                      ? "bg-[var(--sidebar-hover)] text-[var(--sidebar-foreground)]"
                      : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-foreground)]"
                  )}
                >
                  <Icon
                    size={18}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-[var(--sidebar-foreground)]"
                        : "text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-foreground)]"
                    )}
                  />
                  {!collapsed && <span>{it.label}</span>}
                  {collapsed && (
                    <Tooltip content={it.label}>
                      <span className="sr-only">{it.label}</span>
                    </Tooltip>
                  )}
                </Link>
              </li>
            );
          })}

          <li className="mt-6 px-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 transition",
                isAccountsActive
                  ? "bg-[var(--sidebar-hover)] text-[var(--sidebar-foreground)]"
                  : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-foreground)]"
              )}
            >
              <Link
                href={accountsHref}
                aria-current={isAccountsActive ? "page" : undefined}
                className="flex flex-1 items-center gap-3 rounded-md px-1 py-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]"
              >
                <Wallet2
                  size={18}
                  className={cn(
                    "transition-transform",
                    isAccountsActive
                      ? "text-[var(--sidebar-foreground)]"
                      : "text-[var(--sidebar-muted)]"
                  )}
                />
                {!collapsed && (
                  <span className="truncate">Contas</span>
                )}
                {collapsed && (
                  <Tooltip content="Contas">
                    <span className="sr-only">Contas</span>
                  </Tooltip>
                )}
                {!collapsed && (
                  <span className="ml-auto text-xs font-semibold text-[var(--sidebar-muted-strong)]">
                    {currencyFormatter.format(totalBalance / 100)}
                  </span>
                )}
              </Link>
              {!collapsed && (
                <button
                  type="button"
                  onClick={toggleAccountsExpanded}
                  className="rounded-md p-1 text-[var(--sidebar-muted)] transition hover:text-[var(--sidebar-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]"
                  aria-expanded={accountsExpanded}
                  aria-controls="sidebar-accounts"
                >
                  <ChevronDown
                    size={16}
                    className={cn(
                      "transition-transform",
                      accountsExpanded ? "rotate-180" : "rotate-0"
                    )}
                  />
                  <span className="sr-only">
                    {accountsExpanded ? "Recolher contas" : "Expandir contas"}
                  </span>
                </button>
              )}
            </div>

            {!collapsed && accountsExpanded && (
              <div id="sidebar-accounts" className="mt-3 space-y-4 text-sm">
                {loadingAccounts && <p className="text-xs text-[var(--sidebar-muted)]">Carregando contas…</p>}
                {accountsError && (
                  <p className="text-xs text-red-400" role="alert">
                    {accountsError}
                  </p>
                )}
                {!loadingAccounts && !accountsError && accountsByGroup.length === 0 && (
                  <p className="text-xs text-[var(--sidebar-muted)]">
                    Nenhuma conta cadastrada. Crie a primeira para começar.
                  </p>
                )}

                {accountsByGroup.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--sidebar-muted)]">
                      {group.label}
                    </p>
                    <ul className="space-y-1">
                      {group.accounts.map((account) => {
                        const isActive = currentAccountId === account.id;
                        return (
                          <li key={account.id}>
                            <Link
                              href={`/contas/${account.id}`}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                                isActive
                                  ? "bg-[var(--sidebar-active)] text-[var(--sidebar-foreground)]"
                                  : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-foreground)]"
                              )}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <span className="font-medium">{account.name}</span>
                              <span className="text-xs font-semibold">
                                {currencyFormatter.format(account.balanceCents / 100)}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--sidebar-border)] px-3 py-2 text-sm font-semibold text-[var(--sidebar-foreground)] transition hover:border-[var(--ring)] hover:text-[var(--sidebar-foreground)]"
                  onClick={() => setIsModalOpen(true)}
                >
                  + Criar conta
                </button>
              </div>
            )}
          </li>
        </ul>

        <div className="border-t px-2 py-2" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex justify-end">
            <IconButton
              className="text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]"
              style={{
                borderColor: "var(--sidebar-border)",
                color: "var(--sidebar-foreground)",
              }}
              aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
              aria-pressed={collapsed}
              onClick={onToggle}
              title={collapsed ? "Expandir" : "Recolher"}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </IconButton>
          </div>
        </div>
      </div>

      <CreateAccountModal open={isModalOpen} onClose={handleModalClose} onCreated={handleAccountCreated} />
    </nav>
  );
}
