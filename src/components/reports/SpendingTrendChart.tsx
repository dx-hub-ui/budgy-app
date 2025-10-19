"use client";

import { useMemo } from "react";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { fmtBRL } from "@/domain/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Props = {
  labels: string[];
  values: number[];
};

export default function SpendingTrendChart({ labels, values }: Props) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Gastos",
          data: values.map((value) => value / 100),
          backgroundColor: "rgba(99, 102, 241, 0.7)",
          borderRadius: 8
        }
      ]
    }),
    [labels, values]
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
