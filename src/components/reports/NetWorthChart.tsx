"use client";

import { useEffect, useMemo, useState } from "react";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { fmtBRL } from "@/domain/format";
import { useTheme } from "@/components/theme/ThemeProvider";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Props = {
  assets: number;
  debts: number;
  net: number;
};

const COLOR_VARIABLES = {
  assets: "--chart-networth-assets",
  debts: "--chart-networth-debts",
  net: "--chart-networth-net"
} as const;

type ColorKey = keyof typeof COLOR_VARIABLES;

type NetWorthColors = Record<ColorKey, string>;

const FALLBACK_COLORS: NetWorthColors = {
  assets: "#16a34a",
  debts: "#ef4444",
  net: "#6366f1"
};

function readColor(key: ColorKey) {
  if (typeof window === "undefined") {
    return FALLBACK_COLORS[key];
  }
  const styles = window.getComputedStyle(window.document.documentElement);
  const value = styles.getPropertyValue(COLOR_VARIABLES[key]);
  return value.trim() || FALLBACK_COLORS[key];
}

export default function NetWorthChart({ assets, debts, net }: Props) {
  const { theme } = useTheme();
  const [colors, setColors] = useState<NetWorthColors>(() => ({ ...FALLBACK_COLORS }));

  useEffect(() => {
    setColors({
      assets: readColor("assets"),
      debts: readColor("debts"),
      net: readColor("net")
    });
  }, [theme]);

  const data = useMemo(
    () => ({
      labels: ["Ativos", "Dívidas", "Patrimônio líquido"],
      datasets: [
        {
          label: "Valor",
          data: [assets / 100, Math.abs(debts) / 100, net / 100],
          backgroundColor: [colors.assets, colors.debts, colors.net],
          borderRadius: 8
        }
      ]
    }),
    [assets, debts, net, colors]
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
