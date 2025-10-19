"use client";

import { useMemo } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { fmtBRL } from "@/domain/format";

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
  labels: string[];
  values: number[];
  colors: string[];
};

export default function SpendingBreakdownChart({ labels, values, colors }: Props) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values.map((value) => value / 100),
          backgroundColor: colors,
          hoverOffset: 8
        }
      ]
    }),
    [labels, values, colors]
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
              const value = Number(context.parsed) * 100;
              const label = context.label ?? "";
              return `${label}: ${fmtBRL(value)}`;
            }
          }
        }
      }
    }),
    []
  );

  return <Doughnut data={data} options={options} />;
}
