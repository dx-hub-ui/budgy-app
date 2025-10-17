"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { listAccounts } from "@/domain/repo";

export default function RedirectToFirstAccount() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAccounts()
      .then((accounts) => {
        if (!active) return;
        if (Array.isArray(accounts) && accounts.length > 0) {
          router.replace(`/contas/${accounts[0].id}`);
        } else {
          router.replace("/contas/nova");
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? "Não foi possível localizar suas contas.");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="grid min-h-[360px] place-items-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="grid min-h-[360px] place-items-center text-sm text-[var(--cc-text-muted)]">
      Carregando contas…
    </div>
  );
}
