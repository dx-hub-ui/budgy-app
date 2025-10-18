"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { mesAtual } from "@/domain/budgeting";

function extractTokensFromHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const defaultBudgetPath = useMemo(() => `/budgets/${mesAtual()}`, []);

  useEffect(() => {
    let active = true;

    const handleCallback = async () => {
      try {
        const hashTokens = extractTokensFromHash(window.location.hash);

        if (hashTokens) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: hashTokens.accessToken,
            refresh_token: hashTokens.refreshToken,
          });

          if (!active) return;

          if (sessionError) {
            setError(sessionError.message);
            return;
          }

          router.replace(defaultBudgetPath);
          return;
        }

        const code = new URLSearchParams(window.location.search).get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (!active) return;

          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }

          router.replace(defaultBudgetPath);
          return;
        }

        if (!active) return;

        setError("Não foi possível validar sua sessão de login.");
      } catch (callbackError) {
        if (!active) return;

        setError(callbackError instanceof Error ? callbackError.message : "Erro desconhecido.");
      }
    };

    void handleCallback();

    return () => {
      active = false;
    };
  }, [defaultBudgetPath, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      {error ? (
        <div className="space-y-3 text-center text-sm">
          <p className="font-medium">Não conseguimos confirmar seu login.</p>
          <p className="text-xs opacity-70">{error}</p>
          <button
            type="button"
            className="h-10 rounded-md border px-4 text-sm"
            style={{ borderColor: "var(--cc-border)" }}
            onClick={() => router.replace("/login")}
          >
            Voltar para o login
          </button>
        </div>
      ) : (
        <p className="text-sm opacity-70">Confirmando seu login…</p>
      )}
    </main>
  );
}
