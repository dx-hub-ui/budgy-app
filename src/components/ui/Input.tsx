"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className = "", type = "text", ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={`h-10 w-full rounded-[var(--cc-radius-1)] border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 text-sm text-[var(--cc-text)] placeholder:text-[var(--cc-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cc-bg)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`.trim()}
      {...rest}
    />
  );
});

export default Input;
