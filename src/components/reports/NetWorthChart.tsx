"use client";

import { useMemo } from "react";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { fmtBRL } from "@/domain/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Props = {
  assets: number;
  debts: number;
  net: number;
};

export default function NetWorthChart({ assets, debts, net }: Props) {
  const data = useMemo(
    () => ({
      labels: ["Ativos", "Dívidas", "Patrimônio líquido"],
      datasets: [
        {
          label: "Valor",
          data: [assets / 100, Math.abs(debts) / 100, net / 100],
          backgroundColor: ["#16a34a", "#ef4444", "#6366f1"],
          borderRadius: 8
        }
      ]
    }),
    [assets, debts, net]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context: any) {
              const value = Number(context.parsed.y ?? 0) * 100;
              return fmtBRL(value);
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback(value: string | number) {
              const number = typeof value === "string" ? Number(value) : value;
              return fmtBRL(number * 100);
            }
          }
        }
      }
    }),
    []
  );

  return <Bar data={data} options={options} />;
}
