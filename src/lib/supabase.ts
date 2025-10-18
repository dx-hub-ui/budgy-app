"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let preferredOrgId: string | null = null;

function resolveOrgIdFromCookies(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const match = document.cookie.match(/(?:^|;\s*)cc_org_id=([^;]+)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      return decoded.length > 0 ? decoded : null;
    }
  } catch (error) {
    console.warn("Falha ao ler o cookie cc_org_id", error);
  }

  return null;
}

function resolveOrgIdHeader(): string | null {
  if (preferredOrgId && preferredOrgId.trim().length > 0) {
    return preferredOrgId.trim();
  }
  const cookieOrg = resolveOrgIdFromCookies();
  if (cookieOrg && cookieOrg.trim().length > 0) {
    return cookieOrg.trim();
  }
  return null;
}

function withOrgHeader(init?: RequestInit): RequestInit | undefined {
  const orgId = resolveOrgIdHeader();
  if (!orgId) {
    return init;
  }

  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("x-cc-org-id")) {
    headers.set("x-cc-org-id", orgId);
  }

  return { ...init, headers };
}

function createSupabaseFallback(): SupabaseClient {
  const error = new Error(
    "Supabase environment variables are not configured. Authentication features are disabled."
  );

  const subscription = {
    unsubscribe: () => {
      /* noop */
    }
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error }),
      getSession: async () => ({ data: { session: null }, error }),
      onAuthStateChange: () => ({ data: { subscription }, error }),
      signOut: async () => ({ error })
    }
  } as unknown as SupabaseClient;
}

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createSupabaseFallback();
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      fetch: async (input, init) => {
        return fetch(input, withOrgHeader(init));
      }
    }
  });
}

export let supabase = createSupabaseClient();

export function setSupabaseOrgId(orgId: string | null | undefined) {
  preferredOrgId = typeof orgId === "string" && orgId.trim().length > 0 ? orgId.trim() : null;
}
