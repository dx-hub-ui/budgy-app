"use client";

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

export default function Avatar({ name, src, size = 36, className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || "?";

  const dimension = `${size}px`;

  if (src) {
    return (
      <img
        src={src}
        alt={`Avatar de ${name}`}
        width={size}
        height={size}
        className={`inline-flex shrink-0 rounded-full object-cover ring-1 ring-[var(--cc-border)] ${className}`.trim()}
      />
    );
  }

  return (
    <span
      aria-label={`Avatar de ${name}`}
      role="img"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--cc-bg-elev)] text-xs font-semibold uppercase tracking-wide ring-1 ring-[var(--cc-border)] text-[var(--cc-text)] ${className}`.trim()}
      style={{ width: dimension, height: dimension }}
    >
      {initials}
    </span>
  );
}
