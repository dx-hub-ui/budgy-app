"use client";

import { forwardRef } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className = "", ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={
        "h-9 w-full rounded-md border bg-transparent px-3 text-sm " +
        "placeholder:opacity-70 focus-visible:outline-none focus-visible:ring-2 " +
        "focus-visible:ring-[var(--cc-accent)] " +
        className
      }
      style={{ borderColor: "var(--cc-border)" }}
      {...rest}
    />
  );
});

export default Input;
