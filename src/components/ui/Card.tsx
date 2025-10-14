import { type ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type CardProps = {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function Card({ title, actions, children, className, id }: CardProps) {
  return (
    <section
      id={id}
      className={cn(
        "card flex flex-col rounded-[var(--radius)] border bg-[var(--card-bg-light)] text-[var(--cc-text)] shadow-[var(--shadow)] transition-colors",
        "dark:bg-[var(--card-bg-dark)]",
        className
      )}
      style={{ borderColor: "var(--cc-border)" }}
    >
      {(title || actions) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {actions && <CardActions>{actions}</CardActions>}
        </CardHeader>
      )}
      {children}
    </section>
  );
}

type CardHeaderProps = { children: ReactNode; className?: string };

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b px-6 pb-4 pt-6",
        "text-[var(--cc-text)]",
        className
      )}
      style={{ borderColor: "var(--cc-border)" }}
    >
      {children}
    </div>
  );
}

type CardTitleProps = { children: ReactNode; className?: string };

export function CardTitle({ children, className }: CardTitleProps) {
  return <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>;
}

type CardActionsProps = { children: ReactNode; className?: string };

export function CardActions({ children, className }: CardActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-live="polite">
      {children}
    </div>
  );
}

type CardContentProps = { children: ReactNode; className?: string };

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("px-6 pb-6 pt-4", className)}>{children}</div>;
}

export default Card;
