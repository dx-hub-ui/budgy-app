"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FocusEvent
} from "react";

export type FieldCurrencyProps = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

function formatDisplay(value: number) {
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
  return formatter.format(value / 100);
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function FieldCurrency({ value, onChange, placeholder, disabled, className, ...rest }: FieldCurrencyProps) {
  const [display, setDisplay] = useState(formatDisplay(value));

  useEffect(() => {
    setDisplay(formatDisplay(value));
  }, [value]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
      }),
    []
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = onlyDigits(event.target.value);
    const cents = digits ? parseInt(digits, 10) : 0;
    onChange(cents);
    setDisplay(formatter.format(cents / 100));
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    const digits = onlyDigits(display);
    event.target.value = digits ? String(Number(digits) / 100) : "0";
    event.target.select();
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const digits = onlyDigits(event.target.value);
    const cents = digits ? parseInt(digits, 10) : 0;
    setDisplay(formatter.format(cents / 100));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      className={["h-10 w-full rounded-md border px-3 text-sm", className]
        .filter(Boolean)
        .join(" ")}
      style={{ borderColor: "var(--cc-border)" }}
      value={display}
      placeholder={placeholder}
      disabled={disabled}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...rest}
    />
  );
}
