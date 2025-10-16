import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";

import { createServerSupabaseClient, resolveUserId } from "@/lib/supabaseServer";

const UpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
  avatarUrl: z.string().url().max(1024).nullable().optional()
});

const supportedTimezones = (() => {
  try {
    return new Set(Intl.supportedValuesOf("timeZone"));
  } catch (error) {
    return null;
  }
})();

function isValidTimezone(value: string) {
  if (!value) return false;
  if (supportedTimezones) {
    return supportedTimezones.has(value);
  }
  return /^[A-Za-z0-9_\/+-]+$/.test(value);
}

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  timezone: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

async function getAuthUser(userId: string, supabase: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw error;
  return data.user ?? null;
}

async function ensureProfile(userId: string, client?: SupabaseClient) {
  const supabase = client ?? createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const user = await getAuthUser(userId, supabase);
  const email = user?.email ?? null;
  const metadataDisplay =
    (user?.user_metadata?.display_name as string | undefined)?.trim() ??
    (user?.user_metadata?.full_name as string | undefined)?.trim() ??
    null;
  const displayName = metadataDisplay || email;

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId, email, display_name: displayName })
    .select("*")
    .single<ProfileRow>();

  if (insertError) {
    if ((insertError as PostgrestError).code === "23505") {
      const { data: retry, error: retryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single<ProfileRow>();
      if (retryError) throw retryError;
      return retry;
    }
    throw insertError;
  }

  return inserted;
}

export async function GET() {
  try {
    const userId = resolveUserId();
    if (!userId) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const profile = await ensureProfile(userId, supabase);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Erro ao carregar perfil", error);
    return NextResponse.json({ message: "Não foi possível carregar o perfil" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = resolveUserId();
    if (!userId) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }

    const payload = parsed.data;
    const updates: Partial<ProfileRow> = {};

    if (payload.displayName !== undefined) {
      const trimmed = payload.displayName.trim();
      updates.display_name = trimmed.length > 0 ? trimmed : null;
    }

    if (payload.timezone !== undefined) {
      if (payload.timezone === null || payload.timezone.trim().length === 0) {
        updates.timezone = null;
      } else if (!isValidTimezone(payload.timezone)) {
        return NextResponse.json({ message: "Fuso horário inválido" }, { status: 400 });
      } else {
        updates.timezone = payload.timezone;
      }
    }

    if (payload.avatarUrl !== undefined) {
      updates.avatar_url = payload.avatarUrl;
    }

    const supabase = createServerSupabaseClient();
    if (Object.keys(updates).length === 0) {
      const profile = await ensureProfile(userId, supabase);
      return NextResponse.json({ profile });
    }
    await ensureProfile(userId, supabase);

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("*")
      .single<ProfileRow>();

    if (updateError) {
      throw updateError;
    }

    try {
      if (payload.displayName !== undefined || payload.avatarUrl !== undefined) {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...(payload.displayName !== undefined ? { display_name: updated?.display_name ?? null } : {}),
            ...(payload.avatarUrl !== undefined ? { avatar_url: updated?.avatar_url ?? null } : {})
          }
        });
      }
    } catch (error) {
      console.warn("Falha ao sincronizar metadados do usuário", error);
    }

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error("Erro ao atualizar perfil", error);
    return NextResponse.json({ message: "Não foi possível salvar o perfil" }, { status: 500 });
  }
}
