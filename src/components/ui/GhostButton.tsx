"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type GhostButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon;
  children: ReactNode;
  variant?: "default" | "primary";
};

const GhostButton = forwardRef<HTMLButtonElement, GhostButtonProps>(function GhostButton(
  { icon: Icon, variant = "default", className, type = "button", children, ...props },
  ref
) {
  const classes = ["ghost-button"];
  if (variant === "primary") {
    classes.push("primary");
  }
  if (className) {
    classes.push(className);
  }

  return (
    <button ref={ref} type={type} className={classes.join(" ")} {...props}>
      <span className="ghost-button__icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2.5} />
      </span>
      <span className="ghost-button__label">{children}</span>
    </button>
  );
});

export default GhostButton;
