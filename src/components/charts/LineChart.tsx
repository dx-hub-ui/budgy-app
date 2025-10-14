"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartOptions,
} from "chart.js";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type LineChartProps = {
  labels: string[];
  data: number[];
  className?: string;
  ariaLabel?: string;
};

export default function LineChart({ labels, data, className, ariaLabel }: LineChartProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => {
      mql.removeEventListener("change", update);
    };
  }, []);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Saldo",
          data,
          tension: 0.4,
          borderColor: "var(--brand)",
          backgroundColor: "var(--brand-soft-fill-strong)",
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "var(--brand)",
          pointBorderColor: "var(--chart-point-border)",
          fill: {
            target: "origin",
            above: "var(--brand-soft-fill)",
          },
        },
      ],
    }),
    [labels, data]
  );

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion
        ? false
        : {
            duration: 800,
            easing: "easeOutQuad",
          },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y ?? 0;
              return new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value);
            },
          },
          displayColors: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "var(--muted)",
          },
        },
        y: {
          grid: {
            color: "var(--chart-grid)",
            drawBorder: false,
          },
          ticks: {
            color: "var(--muted)",
            callback: (value) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(Number(value)),
          },
        },
      },
    }),
    [reducedMotion]
  );

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? "Linha do tempo de saldo mensal"}
      className={cn("relative h-[280px] w-full", className)}
    >
      <Line data={chartData} options={options} redraw={reducedMotion} />
    </div>
  );
}
