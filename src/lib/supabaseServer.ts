import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL não configurada. Defina NEXT_PUBLIC_SUPABASE_URL.");
}

export function createServerSupabaseClient() {
  if (!serviceKey) {
    throw new Error(
      "Chave de serviço do Supabase não configurada. Defina SUPABASE_SERVICE_ROLE_KEY para operações seguras."
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    global: {
      headers: Object.fromEntries(headers().entries())
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

export function resolveUserId(): string | null {
  const headerUser = headers().get("x-cc-user-id");
  if (headerUser && headerUser.trim().length > 0) {
    return headerUser.trim();
  }
  const cookieUser = cookies().get("cc_user_id")?.value;
  return cookieUser ?? null;
}
