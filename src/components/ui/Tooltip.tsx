"use client";

import { useId } from "react";

export default function Tooltip({
  children,
  content
}: {
  children: React.ReactNode;
  content: string;
}) {
  const id = useId();
  // Minimal a11y-friendly tooltip placeholder. Real tooltips can use a lib later.
  return (
    <span aria-describedby={id}>
      {children}
      <span id={id} className="sr-only">
        {content}
      </span>
    </span>
  );
}
