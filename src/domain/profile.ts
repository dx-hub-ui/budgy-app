import { z } from "zod";

import { authFetch } from "@/lib/authFetch";

const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  display_name: z.string().max(120).nullable().optional(),
  timezone: z.string().max(80).nullable().optional(),
  avatar_url: z.string().url().max(1024).nullable().optional(),
  updated_at: z.string().datetime({ offset: true }).nullable().optional()
});

export type UserProfile = z.infer<typeof ProfileSchema>;

const ProfileResponseSchema = z.object({ profile: ProfileSchema });

async function handleJson<T>(response: Response, schema: z.ZodSchema<T>): Promise<T> {
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error("Não foi possível interpretar a resposta do servidor.");
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error);
    throw new Error(data && typeof data === "object" && "message" in data ? (data as any).message : "Resposta inválida");
  }

  return parsed.data;
}

export async function fetchProfile(): Promise<UserProfile | null> {
  const response = await authFetch("/api/profile", { cache: "no-store" });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Não foi possível carregar o perfil");
  }
  const { profile } = await handleJson(response, ProfileResponseSchema);
  return profile;
}

type UpdateProfilePayload = {
  displayName?: string;
  timezone?: string | null;
  avatarUrl?: string | null;
};

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const response = await authFetch("/api/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Não foi possível salvar o perfil");
  }

  const { profile } = await handleJson(response, ProfileResponseSchema);
  return profile;
}

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authFetch("/api/profile/avatar", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha ao enviar o avatar");
  }

  const data = await response.json();
  const url = typeof data?.url === "string" ? data.url : null;
  if (!url) {
    throw new Error("Resposta inválida ao enviar o avatar");
  }
  return url;
}
