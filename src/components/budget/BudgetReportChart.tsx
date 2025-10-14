"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { fmtBRL } from "@/domain/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type BudgetReportChartProps = {
  labels: string[];
  planned: number[];
  actual: number[];
};

export default function BudgetReportChart({ labels, planned, actual }: BudgetReportChartProps) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Previsto",
          data: planned.map((value) => value / 100),
          backgroundColor: "rgba(99, 102, 241, 0.7)",
          borderRadius: 6
        },
        {
          label: "Realizado",
          data: actual.map((value) => value / 100),
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderRadius: 6
        }
      ]
    }),
    [labels, planned, actual]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" as const },
        tooltip: {
          callbacks: {
            label(context: any) {
              const value = Number(context.parsed.y ?? 0) * 100;
              return `${context.dataset.label}: ${fmtBRL(value)}`;
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
