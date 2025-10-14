"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <label className="block text-sm">
          Email
          <input
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            required
            autoComplete="email"
          />
        </label>
        <button
          className="h-10 w-full rounded-md border px-4 text-sm"
          style={{ borderColor: "var(--cc-border)" }}
          type="submit"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Enviar link"}
        </button>
        {sent && <p className="text-sm opacity-80">Verifique seu e-mail para continuar.</p>}
      </form>
    </main>
  );
}
