import { cookies, headers } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function resolveSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!url) {
    throw new Error("Supabase URL não configurada. Defina NEXT_PUBLIC_SUPABASE_URL.");
  }

  return url as string;
}

function resolveServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      "Chave de serviço do Supabase não configurada. Defina SUPABASE_SERVICE_ROLE_KEY para operações seguras."
    );
  }

  return key as string;
}

export function createServerSupabaseClient() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceKey: string = resolveServiceRoleKey();
  const incomingHeaders = Object.fromEntries(headers().entries());
  const orgId = resolveOrgId();

  if (!incomingHeaders["x-cc-org-id"] && orgId) {
    incomingHeaders["x-cc-org-id"] = orgId;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    global: {
      headers: incomingHeaders
    }
  });
}

export function resolveOrgId(): string {
  const headerOrg = headers().get("x-cc-org-id");
  if (headerOrg && headerOrg.trim().length > 0) {
    return headerOrg.trim();
  }
  const cookieOrg = cookies().get("cc_org_id")?.value;
  if (cookieOrg && cookieOrg.trim().length > 0) {
    return cookieOrg.trim();
  }
  return "00000000-0000-0000-0000-000000000001";
}

function extractBearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/Bearer\s+(.+)/i);
  return match ? match[1].trim() : null;
}

export async function resolveUserId(client?: SupabaseClient): Promise<string | null> {
  const headerUser = headers().get("x-cc-user-id");
  if (headerUser && headerUser.trim().length > 0) {
    return headerUser.trim();
  }
  const cookieUser = cookies().get("cc_user_id")?.value;
  if (cookieUser && cookieUser.trim().length > 0) {
    return cookieUser.trim();
  }

  const authHeader = headers().get("authorization") ?? headers().get("Authorization");
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }

  const supabase = client ?? createServerSupabaseClient();

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.warn("Falha ao validar token de sessão", error);
      return null;
    }
    return data.user?.id ?? null;
  } catch (error) {
    console.warn("Erro inesperado ao resolver usuário autenticado", error);
    return null;
  }
}
