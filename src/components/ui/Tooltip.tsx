"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from "react";

type TooltipProps = {
  content: string;
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  side?: "left" | "right" | "top" | "bottom";
};

export default function Tooltip({ children, content, side = "right" }: TooltipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const show = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setOpen(true), 60);
  };

  const hide = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(false);
  };

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        hide();
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  if (!isValidElement(children)) {
    return children;
  }

  const childProps = children.props as Partial<HTMLAttributes<HTMLElement>>;

  const trigger = cloneElement(children, {
    "aria-describedby": open ? tooltipId : undefined,
    onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => {
      childProps.onMouseEnter?.(event);
      show();
    },
    onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => {
      childProps.onMouseLeave?.(event);
      hide();
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(event);
      show();
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      hide();
    },
  });

  const sideClasses: Record<NonNullable<TooltipProps["side"]>, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 -translate-y-2",
    bottom: "top-full left-1/2 -translate-x-1/2 translate-y-2",
    left: "right-full top-1/2 -translate-y-1/2 -translate-x-2",
    right: "left-full top-1/2 -translate-y-1/2 translate-x-2",
  } as const;

  return (
    <span className="relative inline-flex" onMouseLeave={hide}>
      {trigger}
      <span
        role="tooltip"
        id={tooltipId}
        aria-hidden={!open}
        className={`pointer-events-none absolute whitespace-nowrap rounded-[var(--cc-radius-1)] bg-[var(--cc-bg-elev)] px-2 py-1 text-xs text-[var(--cc-text)] shadow-lg ring-1 ring-[var(--cc-border)] transition-all duration-150 ${sideClasses[side]} ${open ? "opacity-100" : "opacity-0"}`.trim()}
      >
        {content}
      </span>
    </span>
  );
}
