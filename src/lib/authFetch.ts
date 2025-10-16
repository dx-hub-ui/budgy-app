import { supabase } from "./supabase";

async function resolveAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("Falha ao obter sessão do Supabase", error);
      return null;
    }
    return data.session?.access_token ?? null;
  } catch (error) {
    console.warn("Erro inesperado ao resolver sessão do Supabase", error);
    return null;
  }
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? undefined);

  if (!headers.has("Authorization")) {
    const token = await resolveAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
