import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";

import {
  createServerSupabaseClient,
  resolveAuthenticatedUser,
  resolveUserId
} from "@/lib/supabaseServer";

const UpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
  avatarUrl: z.string().url().max(1024).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional()
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
  org_id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  timezone: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

const secureCookie = process.env.NODE_ENV === "production";
const profileCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: secureCookie,
  path: "/"
};

function respondWithProfile(profile: ProfileRow) {
  const response = NextResponse.json({ profile });
  const maxAge = 60 * 60 * 24 * 365;
  response.cookies.set("cc_user_id", profile.id, {
    ...profileCookieOptions,
    maxAge
  });
  if (profile.org_id) {
    response.cookies.set("cc_org_id", profile.org_id, {
      ...profileCookieOptions,
      maxAge
    });
  }
  return response;
}

function clearProfileCookies(status: number, message: string) {
  const response = NextResponse.json({ message }, { status });
  response.cookies.set("cc_user_id", "", {
    ...profileCookieOptions,
    maxAge: 0
  });
  response.cookies.set("cc_org_id", "", {
    ...profileCookieOptions,
    maxAge: 0
  });
  return response;
}

async function resolveProfileMetadata(
  userId: string,
  supabase: SupabaseClient,
  authUser?: User | null
): Promise<User | null> {
  if (authUser?.id === userId) {
    return authUser;
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.warn("Falha ao obter metadados do usuário para o perfil", error);
      return null;
    }
    return data.user ?? null;
  } catch (error) {
    console.warn("Erro inesperado ao obter metadados do usuário para o perfil", error);
    return null;
  }
}

async function ensureProfile(userId: string, client?: SupabaseClient, authUser?: User | null) {
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

  const metadataUser = await resolveProfileMetadata(userId, supabase, authUser);

  const email = metadataUser?.email ?? null;
  const metadataDisplay =
    (metadataUser?.user_metadata?.display_name as string | undefined)?.trim() ??
    (metadataUser?.user_metadata?.full_name as string | undefined)?.trim() ??
    null;
  const metadataPhone = (() => {
    const direct = typeof metadataUser?.phone === "string" ? metadataUser.phone.trim() : "";
    if (direct.length > 0) {
      return direct;
    }
    const meta = metadataUser?.user_metadata?.phone;
    return typeof meta === "string" && meta.trim().length > 0 ? meta.trim() : null;
  })();
  const displayName = metadataDisplay || email || "Usuário";
  const phone = metadataPhone ?? null;

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId, email, display_name: displayName, phone, org_id: randomUUID() })
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
    const supabase = createServerSupabaseClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return clearProfileCookies(401, "Não autenticado");
    }

    const authUser = await resolveAuthenticatedUser(supabase);
    const profile = await ensureProfile(userId, supabase, authUser);
    return respondWithProfile(profile);
  } catch (error) {
    console.error("Erro ao carregar perfil", error);
    return clearProfileCookies(500, "Não foi possível carregar o perfil");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const authUser = await resolveAuthenticatedUser(supabase);

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

    if (payload.phone !== undefined) {
      if (payload.phone === null) {
        updates.phone = null;
      } else {
        const trimmed = payload.phone.trim();
        if (trimmed.length === 0) {
          updates.phone = null;
        } else if (!/^[0-9()+\-\.\s]+$/.test(trimmed)) {
          return NextResponse.json({ message: "Telefone inválido" }, { status: 400 });
        } else {
          updates.phone = trimmed;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      const profile = await ensureProfile(userId, supabase, authUser);
      return respondWithProfile(profile);
    }
    await ensureProfile(userId, supabase, authUser);

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
      const metadataUpdates: Record<string, string | null> = {};
      if (payload.displayName !== undefined) {
        metadataUpdates.display_name = updated?.display_name ?? null;
      }
      if (payload.avatarUrl !== undefined) {
        metadataUpdates.avatar_url = updated?.avatar_url ?? null;
      }
      if (payload.phone !== undefined) {
        metadataUpdates.phone = updated?.phone ?? null;
      }
      if (Object.keys(metadataUpdates).length > 0) {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: metadataUpdates
        });
      }
    } catch (error) {
      console.warn("Falha ao sincronizar metadados do usuário", error);
    }

    if (!updated) {
      throw new Error("Perfil não encontrado após atualização");
    }

    return respondWithProfile(updated);
  } catch (error) {
    console.error("Erro ao atualizar perfil", error);
    return NextResponse.json({ message: "Não foi possível salvar o perfil" }, { status: 500 });
  }
}
