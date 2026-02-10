"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";
import { getAccessToken } from "@/lib/auth";
import { apiUrl } from "@/lib/config";

// ApexCharts needs to be client-side only
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Row = {
  time?: string;
  temperature_2m?: number | null;
  rain?: number | null;
};

export default function WeatherPredictionChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 14); // show ~14 days ahead

    const params = new URLSearchParams();
    params.set("start_date", start.toISOString().slice(0, 10));
    params.set("end_date", end.toISOString().slice(0, 10));
    params.set("isDefaultLocation", "false");

    const url = apiUrl(`/WeatherForecast/grid?${params.toString()}`);
    setLoading(true);
    const token = getAccessToken();
    fetch(url, { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        const nextRows: Row[] = Array.isArray(data?.rows) ? data.rows : [];
        setRows(nextRows);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const temps: { x: number; y: number | null }[] = [];
    const rains: { x: number; y: number | null }[] = [];

    for (const r of rows) {
      const ts = r.time ? Date.parse(r.time) : NaN;
      if (!Number.isNaN(ts)) {
        temps.push({ x: ts, y: r.temperature_2m ?? null });
        rains.push({ x: ts, y: r.rain ?? null });
      }
    }

    return { temps, rains };
  }, [rows]);

  const options = useMemo<any>(() => ({
    chart: {
      id: "weather-chart",
      toolbar: { show: true },
      animations: { enabled: true },
      background: "transparent",
      foreColor: isDark ? "#cbd5e1" : "#64748b", // slate-300 vs slate-500
    },
    theme: { mode: isDark ? "dark" : "light" },
    stroke: { curve: "smooth", width: [2, 0] },
    dataLabels: { enabled: false },
    xaxis: {
      type: "datetime",
      labels: { datetimeUTC: false },
    },
    yaxis: [
      {
        title: { text: "Temp (°C)" },
        decimalsInFloat: 1,
        labels: { style: { colors: isDark ? "#cbd5e1" : "#64748b" } },
      },
      {
        opposite: true,
        title: { text: "Rain (mm)" },
        decimalsInFloat: 1,
        labels: { style: { colors: isDark ? "#cbd5e1" : "#64748b" } },
      },
    ],
    grid: { strokeDashArray: 3, borderColor: isDark ? "#334155" : "#e5e7eb" },
    tooltip: { shared: true, theme: isDark ? "dark" : "light", x: { format: "dd MMM HH:mm" } },
    legend: { position: "top" },
  }), [isDark]);

  const series = useMemo(
    () => [
      {
        name: "Temperature",
        type: "line",
        data: chartData.temps,
      },
      {
        name: "Rain",
        type: "column",
        data: chartData.rains,
      },
    ],
    [chartData]
  );

  if (loading) {
    return (
      <div className="rounded border border-gray-200 p-4 dark:border-white/[0.06]">
        Loading weather chart...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
        Failed to load weather data: {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded border border-gray-200 p-4 text-gray-600 dark:border-white/[0.06] dark:text-gray-300">
        No weather data available.
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-200 p-4 dark:border-white/[0.06]">
      <ApexChart options={options} series={series} type="line" height={360} />
    </div>
  );
}
