"use client";

import { forwardRef } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

const baseClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm " +
  "hover:bg-[var(--cc-bg-elev)] focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[var(--ring)] transition-colors";

const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { className = "", type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${baseClass} ${className}`.trim()}
      style={{ borderColor: "var(--cc-border)" }}
      {...rest}
    />
  );
});

export default IconButton;
