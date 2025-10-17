"use client";

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import Card, { CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/components/auth/AuthGate";
import { updateProfile, uploadAvatar } from "@/domain/profile";

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore"
];

export default function ProfilePage() {
  const { user, profile, displayName, avatarUrl, refreshProfile, setProfile } = useAuth();
  const [displayNameValue, setDisplayNameValue] = useState<string>(displayName ?? "");
  const [timezoneValue, setTimezoneValue] = useState<string>(profile?.timezone ?? "");
  const [phoneValue, setPhoneValue] = useState<string>(profile?.phone ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDisplayNameValue(profile?.display_name ?? displayName ?? "");
    setTimezoneValue(profile?.timezone ?? "");
    setPhoneValue(profile?.phone ?? "");
    setAvatarPreview(profile?.avatar_url ?? avatarUrl ?? null);
  }, [profile, displayName, avatarUrl]);

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch (error) {
      return FALLBACK_TIMEZONES;
    }
  }, []);

  const handleSelectAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setFeedback(null);
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      setAvatarPreview(url);
      setFeedback("Avatar atualizado com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao enviar avatar";
      setError(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const payloadDisplay = displayNameValue.trim();
      const updated = await updateProfile({
        displayName: payloadDisplay,
        timezone: timezoneValue ? timezoneValue : null,
        avatarUrl: avatarPreview,
        phone: phoneValue.trim().length > 0 ? phoneValue.trim() : null
      });
      setProfile(updated);
      await refreshProfile();
      setFeedback("Perfil atualizado com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar o perfil";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const initials = displayNameValue.trim().charAt(0).toUpperCase() || (user.email?.charAt(0).toUpperCase() ?? "?");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--cc-bg)] text-[var(--cc-text)]">
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-auto px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-[var(--cc-text)]">Meu Perfil</h1>
            <p className="text-sm text-[var(--cc-text-muted)]">
              Atualize suas preferências de conta, fuso horário e avatar.
            </p>
          </div>

          <Card>
            <CardContent>
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar
                    label={initials}
                    src={avatarPreview ?? undefined}
                    size={72}
                    alt={displayNameValue || "Avatar do usuário"}
                    className="text-base"
                  />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAvatar}
                        className="rounded-full bg-[var(--cc-accent)] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-95 disabled:opacity-60"
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? "Enviando avatar..." : "Alterar avatar"}
                      </button>
                      {avatarPreview ? (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="rounded-full border border-[var(--cc-border)] px-4 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:border-[var(--ring)] hover:text-[var(--ring)]"
                        >
                          Remover avatar
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--cc-text-muted)]">
                      PNG, JPG ou WEBP com até 5MB.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="displayName" className="text-sm font-medium">
                      Nome de exibição
                    </label>
                    <Input
                      id="displayName"
                      value={displayNameValue}
                      onChange={(event) => setDisplayNameValue(event.target.value)}
                      maxLength={120}
                      placeholder="Como você quer ser chamado"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="timezone" className="text-sm font-medium">
                      Fuso horário
                    </label>
                    <select
                      id="timezone"
                      value={timezoneValue}
                      onChange={(event) => setTimezoneValue(event.target.value)}
                      className="h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
                      style={{ borderColor: "var(--cc-border)" }}
                    >
                      <option value="">Selecionar fuso horário</option>
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Telefone
                  </label>
                  <Input
                    id="phone"
                    value={phoneValue}
                    onChange={(event) => setPhoneValue(event.target.value)}
                    maxLength={32}
                    placeholder="Informe um telefone para contato (opcional)"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </label>
                  <Input id="email" value={user.email ?? ""} readOnly disabled className="opacity-70" />
                </div>

                {error ? (
                  <div className="rounded-md border border-[var(--state-danger)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {error}
                  </div>
                ) : null}

                {feedback ? (
                  <div className="rounded-md border border-[var(--cc-border)] bg-[var(--brand-soft-bg)] px-4 py-3 text-sm text-[var(--cc-text)]">
                    {feedback}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="rounded-full bg-[var(--cc-accent)] px-6 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
