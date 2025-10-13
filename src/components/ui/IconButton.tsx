"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

const baseClasses =
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors";

const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { className = "", type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${baseClasses} border border-[var(--cc-border)] bg-transparent text-[var(--cc-text)] hover:bg-[var(--cc-bg-elev)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cc-bg)] ${className}`.trim()}
      {...rest}
    />
  );
});

export default IconButton;
