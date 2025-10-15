import { ChangeEvent } from "react";

type MonthOption = {
  value: string;
  label: string;
};

type MonthPickerProps = {
  value: string;
  options: MonthOption[];
  onChange: (value: string) => void;
};

export function MonthPicker({ value, options, onChange }: MonthPickerProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value);
  }

  return (
    <label className="flex flex-col text-sm text-[var(--cc-text)]">
      <span className="mb-1 font-semibold">Mês</span>
      <select
        value={value}
        onChange={handleChange}
        className="h-10 rounded-md border border-[var(--cc-border)] bg-[var(--cc-surface)] px-3 text-sm font-medium text-[var(--cc-text)] shadow-[var(--cc-shadow-1)] focus:outline-none focus:ring-2 focus:ring-[var(--cc-accent)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
