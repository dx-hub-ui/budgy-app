"use client";

export default function Avatar({ label = "?" }: { label?: string }) {
  return (
    <div
      aria-label="Conta do usuário"
      className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold"
      style={{ borderColor: "var(--cc-border)", background: "var(--cc-bg-elev)" }}
    >
      {label}
    </div>
  );
}
