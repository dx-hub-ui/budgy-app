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

import { useTheme } from "../theme/ThemeProvider";

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

const COLOR_KEYS = [
  "brand",
  "brandSoftFill",
  "brandSoftFillStrong",
  "chartGrid",
  "chartPointBorder",
  "muted",
] as const;

type ColorKey = (typeof COLOR_KEYS)[number];
type Colors = Record<ColorKey, string>;

const FALLBACK_COLORS: Colors = {
  brand: "#22c55e",
  brandSoftFill: "rgba(34, 197, 94, 0.12)",
  brandSoftFillStrong: "rgba(34, 197, 94, 0.24)",
  chartGrid: "rgba(34, 197, 94, 0.18)",
  chartPointBorder: "#ffffff",
  muted: "#5b7065",
};

const CSS_VARIABLES: Record<ColorKey, string> = {
  brand: "--brand",
  brandSoftFill: "--brand-soft-fill",
  brandSoftFillStrong: "--brand-soft-fill-strong",
  chartGrid: "--chart-grid",
  chartPointBorder: "--chart-point-border",
  muted: "--muted",
};

function readCssVariable(variable: ColorKey) {
  if (typeof window === "undefined") {
    return FALLBACK_COLORS[variable];
  }

  const styles = window.getComputedStyle(window.document.documentElement);
  const value = styles.getPropertyValue(CSS_VARIABLES[variable]);
  return value.trim() || FALLBACK_COLORS[variable];
}

export default function LineChart({ labels, data, className, ariaLabel }: LineChartProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const { theme } = useTheme();
  const [colors, setColors] = useState<Colors>(() => ({ ...FALLBACK_COLORS }));

  useEffect(() => {
    setColors({
      brand: readCssVariable("brand"),
      brandSoftFill: readCssVariable("brandSoftFill"),
      brandSoftFillStrong: readCssVariable("brandSoftFillStrong"),
      chartGrid: readCssVariable("chartGrid"),
      chartPointBorder: readCssVariable("chartPointBorder"),
      muted: readCssVariable("muted"),
    });
  }, [theme]);

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
          borderColor: colors.brand,
          backgroundColor: colors.brandSoftFillStrong,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: colors.brand,
          pointBorderColor: colors.chartPointBorder,
          fill: {
            target: "origin",
            above: colors.brandSoftFill,
          },
        },
      ],
    }),
    [labels, data, colors]
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
            color: colors.muted,
          },
        },
        y: {
          grid: {
            color: colors.chartGrid,
            drawBorder: false,
          },
          ticks: {
            color: colors.muted,
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
    [reducedMotion, colors]
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
