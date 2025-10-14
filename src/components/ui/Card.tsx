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
        "cc-card flex flex-col p-4 md:p-6 text-[var(--cc-text)] transition-colors",
        "dark:bg-[var(--card-bg-dark)]",
        className
      )}
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
        "-mx-4 flex items-start justify-between gap-3 border-b px-4 pb-4 pt-2",
        "md:-mx-6 md:px-6 md:pb-5 md:pt-3",
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
  return (
    <h2 className={cn("text-[15px] leading-[22px] font-semibold", className)}>
      {children}
    </h2>
  );
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
  return <div className={cn("pt-4 md:pt-6", className)}>{children}</div>;
}

export default Card;
