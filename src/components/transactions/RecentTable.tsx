export type RecentRow = {
  id: string;
  name: string;
  note?: string;
  occurred_on: string;
  time: string;
  status: "pending" | "completed" | "failed";
  amount: number;
};

type RecentTableProps = {
  rows: RecentRow[];
};

const statusTokens: Record<RecentRow["status"], { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  },
  completed: {
    label: "Concluída",
    className:
      "bg-[var(--brand-soft-bg)] text-[var(--brand)] dark:bg-[var(--brand-soft-fill)] dark:text-[var(--brand)]",
  },
  failed: {
    label: "Falhou",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function RecentTable({ rows }: RecentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--cc-border)] text-left text-sm">
        <caption className="sr-only">Transações recentes</caption>
        <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Nome / Nota
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Data
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Hora
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Valor
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--cc-border)]">
          {rows.map((row) => {
            const status = statusTokens[row.status];
            return (
              <tr
                key={row.id}
                className="hover:bg-[rgba(37,99,235,0.06)] focus-within:bg-[rgba(37,99,235,0.06)] dark:hover:bg-[rgba(96,165,250,0.08)] dark:focus-within:bg-[rgba(96,165,250,0.08)]"
              >
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--cc-text)]">{row.name}</span>
                    {row.note && <span className="text-xs text-[var(--muted)]">{row.note}</span>}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-[var(--cc-text)]">{row.occurred_on}</td>
                <td className="whitespace-nowrap px-4 py-4 text-[var(--cc-text)]">{row.time}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`.trim()}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-[var(--cc-text)]">
                  {formatCurrency(row.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
