"use client";

type AvatarProps = {
  label?: string;
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Avatar({ label = "?", src, alt, size = 32, className }: AvatarProps) {
  const dimension = Math.max(24, size);
  const fallbackLabel = label.trim().length > 0 ? label.trim() : "?";

  return (
    <div
      aria-label={alt ?? "Conta do usuário"}
      className={cn(
        "relative flex items-center justify-center rounded-full border text-xs font-semibold uppercase",
        className
      )}
      style={{
        borderColor: "var(--cc-border)",
        background: "var(--cc-bg-elev)",
        width: `${dimension}px`,
        height: `${dimension}px`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? fallbackLabel} className="h-full w-full rounded-full object-cover" />
      ) : (
        fallbackLabel
      )}
    </div>
  );
}
