"use client";

import { forwardRef } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { className = "", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm " +
        "hover:bg-[var(--cc-bg-elev)] focus-visible:outline-none focus-visible:ring-2 " +
        "focus-visible:ring-[var(--cc-accent)]"
      }
      style={{ borderColor: "var(--cc-border)" }}
      {...rest}
    />
  );
});

export default IconButton;
