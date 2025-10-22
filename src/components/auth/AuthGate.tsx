"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase, setSupabaseOrgId } from "@/lib/supabase";
import { fetchProfile, type UserProfile } from "@/domain/profile";

type AuthContextValue = {
  user: User;
  profile: UserProfile | null;
  displayName: string;
  avatarUrl: string | null;
  orgId: string | null;
  loadingProfile: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  setProfile: (profile: UserProfile | null) => void;
  signOut: () => Promise<void>;
  signingOut: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const setProfile = useCallback((nextProfile: UserProfile | null) => {
    setProfileState(nextProfile);
    setSupabaseOrgId(nextProfile?.org_id ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    const handleUnauthenticated = () => {
      if (!active) return;
      setUser(null);
      setProfile(null);
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
      const { data: subscriptionData } = supabase.auth.onAuthStateChange(async () => {
        if (!active) {
          return;
        }

        try {
          const { data, error } = await supabase.auth.getUser();
          if (error || !data.user) {
            handleUnauthenticated();
            return;
          }

          setUser(data.user);
        } catch (_error) {
          handleUnauthenticated();
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
  }, [router, setProfile]);

  const signOut = useCallback(async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      setSupabaseOrgId(null);
    } finally {
      setSigningOut(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const loaded = await fetchProfile();
      setProfile(loaded);
      return loaded;
    } catch (error) {
      console.error("Erro ao carregar perfil do usuário", error);
      setProfile(null);
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, [setProfile]);

  useEffect(() => {
    if (user === undefined) {
      return;
    }

    if (!user) {
      setProfile(null);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        setLoadingProfile(true);
        const data = await fetchProfile();
        if (active) {
          setProfile(data);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil do usuário", error);
        if (active) {
          setProfile(null);
        }
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [setProfile, user]);

  if (user === undefined) {
    return <div className="grid min-h-screen place-items-center text-sm opacity-70">Carregando…</div>;
  }

  if (!user) {
    return null;
  }

  const displayName = (() => {
    if (profile?.display_name && profile.display_name.trim().length > 0) {
      return profile.display_name.trim();
    }
    const metadataDisplay = (user.user_metadata?.display_name as string | undefined)?.trim();
    if (metadataDisplay && metadataDisplay.length > 0) {
      return metadataDisplay;
    }
    const fullName = (user.user_metadata?.full_name as string | undefined)?.trim();
    if (fullName && fullName.length > 0) {
      return fullName;
    }
    return user.email ?? "Usuário";
  })();

  const avatarUrl = (() => {
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    const metadataAvatar = user.user_metadata?.avatar_url;
    return typeof metadataAvatar === "string" && metadataAvatar.length > 0 ? metadataAvatar : null;
  })();

  const orgId = profile?.org_id ?? null;

  const value: AuthContextValue = {
    user,
    profile,
    displayName,
    avatarUrl,
    orgId,
    loadingProfile,
    refreshProfile,
    setProfile,
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
