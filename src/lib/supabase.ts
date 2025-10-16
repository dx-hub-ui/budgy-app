"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    : createSupabaseFallback();
