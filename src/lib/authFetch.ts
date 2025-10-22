import { supabase } from "./supabase";

async function resolveAccessToken(): Promise<string | null> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      if (userError) {
        console.warn("Falha ao verificar usuário do Supabase", userError);
      }
      return null;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn("Falha ao obter sessão do Supabase", sessionError);
      return null;
    }
    return sessionData.session?.access_token ?? null;
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
