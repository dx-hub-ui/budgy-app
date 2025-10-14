"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User;
  signOut: () => Promise<void>;
  signingOut: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    const handleUnauthenticated = () => {
      if (!active) return;
      setUser(null);
      router.replace("/login");
    };

    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error) {
          handleUnauthenticated();
          return;
        }

        const nextUser = data.user ?? null;
        if (!nextUser) {
          handleUnauthenticated();
          return;
        }

        setUser(nextUser);
      } catch (_error) {
        handleUnauthenticated();
      }
    };

    void loadUser();

    let unsubscribe: (() => void) | undefined;

    try {
      const { data: subscriptionData } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) {
          return;
        }

        const nextUser = session?.user ?? null;
        if (!nextUser) {
          handleUnauthenticated();
        } else {
          setUser(nextUser);
        }
      });

      unsubscribe = () => {
        subscriptionData.subscription.unsubscribe();
      };
    } catch (_error) {
      handleUnauthenticated();
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [router]);

  const signOut = useCallback(async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  }, []);

  if (user === undefined) {
    return <div className="grid min-h-screen place-items-center text-sm opacity-70">Carregando…</div>;
  }

  if (!user) {
    return null;
  }

  const value: AuthContextValue = {
    user,
    signOut,
    signingOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthGate");
  }
  return ctx;
}
