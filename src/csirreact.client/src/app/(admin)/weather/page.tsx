"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocation } from "@/context/LocationContext";
import { useSelectedLocation } from "@/context/SelectedLocationContext";
import BasicTableOne from "../../../components/tables/BasicTableOne";
import WeatherTreeView from "../../../components/tables/WeatherTreeView";
import MultiLocationTreeView from "@/components/tables/MultiLocationTreeView";
import { getAccessToken } from "@/lib/auth";
import { apiUrl } from "@/lib/config";
import SimpleWeatherWidget from "@/components/weather/SimpleWeatherWidget";

export default function WeatherPage() {
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "tree" | "multi">("grid");
  const [locationHeader, setLocationHeader] = useState<string>("");
  const [countryName, setCountryName] = useState<string>("");
  const [countryCapital, setCountryCapital] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [dayStats, setDayStats] = useState<Array<{ DateText?: string; TempMin?: number | null; TempMax?: number | null; RainAvg?: number | null; Count?: number }>>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [expandControl, setExpandControl] = useState<"expand" | "collapse" | null>(null);
  const [isDefaultLocation, setIsDefaultLocation] = useState<boolean>(true);
  const { setMode } = useLocation();
  const { setSelected } = useSelectedLocation();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(true);

  const handleUnauthorized = React.useCallback(() => {
    setAuthorized(false);
    router.replace("/signin");
  }, [router]);

  // Redirect to signin when no token is present
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setAuthorized(false);
      router.replace("/signin");
    } else {
      setAuthorized(true);
    }
  }, [router]);
  const fetchData = React.useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (isDefaultLocation !== undefined) params.set("isDefaultLocation", String(isDefaultLocation));
    const url = apiUrl(`/WeatherForecast/grid?${params.toString()}`);
    setLoading(true);
    const token = getAccessToken();
    fetch(url, { cache: "no-store", credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then(async (res) => {
        if (res.status === 401) { handleUnauthorized(); return; }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        setRows(rows);
        setLocationHeader(typeof data?.locationHeader === "string" ? data.locationHeader : "");
        setCountryName(typeof data?.countryName === "string" ? data.countryName : "");
        setCity(typeof data?.city === "string" ? data.city : "");
        setDayStats(Array.isArray(data?.days) ? data.days : []);
      })
      .catch((e) => {
        const msg = String(e?.message || "");
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate, isDefaultLocation]);

  type MultiLocation = {
    name: string;
    header?: string | null;
    rows: Array<Record<string, any>>;
    days: Array<{ DateText?: string; TempMin?: number | null; TempMax?: number | null; RainAvg?: number | null; Count?: number }>;
  };
  const [multiLocations, setMultiLocations] = useState<MultiLocation[]>([]);
  const [multiLoading, setMultiLoading] = useState<boolean>(false);
  const [multiError, setMultiError] = useState<string | null>(null);

  const fetchMultiData = React.useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const url = apiUrl(`/WeatherForecast/grid-multi?${params.toString()}`);
    setMultiLoading(true);
    const token = getAccessToken();
    fetch(url, { cache: "no-store", credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then(async (res) => {
        if (res.status === 401) { handleUnauthorized(); return; }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        const locs: MultiLocation[] = Array.isArray(data?.locations)
          ? data.locations.map((l: any) => ({
              name: String(l?.name ?? "Unknown"),
              header: typeof l?.header === "string" ? l.header : null,
              rows: Array.isArray(l?.rows) ? l.rows : [],
              days: Array.isArray(l?.days) ? l.days : [],
            }))
          : [];
        setMultiLocations(locs);
      })
      .catch((e) => {
        const msg = String(e?.message || "");
        setMultiError(msg);
      })
      .finally(() => setMultiLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    if (!authorized) return; // avoid flashing while redirecting
    fetchData();
  }, [authorized, fetchData]);

  useEffect(() => {
    if (!authorized) return;
    if (view === "multi") fetchMultiData();
  }, [authorized, view, fetchMultiData]);

  if (!authorized) return null;
  return (
    <div className="p-6">
      {/* <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">Weather</h1> */}
      {view === "multi" ? (
        <div className="mb-2 text-theme-sm text-gray-600 dark:text-gray-300">{locationHeader || "Centurion | Johannesburg | Pretoria"}</div>
      ) : (
        (countryName || countryCapital || city) ? (
          <div className="mb-3">
            {countryName && (
              <div className="text-2xl font-semibold text-gray-800 dark:text-white/90">{countryName}</div>
            )}
            {countryCapital && (
              <div className="text-lg text-gray-700 dark:text-gray-200">{countryCapital}</div>
            )}
            {city && (
              <div className="text-theme-sm text-gray-600 dark:text-gray-300">{city}</div>
            )}
          </div>
        ) : (
          locationHeader && (
            <div className="mb-2 text-theme-sm text-gray-600 dark:text-gray-300">{locationHeader}</div>
          )
        )
      )}
      {/* Row: Left widget, Right controls */}
      <div className="mb-4 flex flex-wrap md:flex-nowrap items-start justify-between gap-6">
        <div className="relative w-full md:w-[320px] lg:w-[360px]">
          <SimpleWeatherWidget />
        </div>
        <div className="min-w-[320px] w-full md:w-auto ml-auto">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {/* <label className="block text-theme-xs text-gray-600 dark:text-gray-300 mb-1">Location</label> */}
              <div className="flex items-center gap-2">
                <button
                  className={`px-3 py-1.5 rounded border text-theme-sm ${
                    isDefaultLocation
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-gray-700 border-gray-200 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06]"
                  }`}
                  onClick={() => {
                    setIsDefaultLocation(true);
                    setMode("default");
                    setSelected(null);
                  }}
                  aria-pressed={isDefaultLocation}
                >
                  Default Location
                </button>
                <button
                  className={`px-3 py-1.5 rounded border text-theme-sm ${
                    !isDefaultLocation
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-gray-700 border-gray-200 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06]"
                  }`}
                  onClick={() => {
                    setIsDefaultLocation(false);
                    setMode("nearest");
                    setSelected(null);
                  }}
                  aria-pressed={!isDefaultLocation}
                >
                  Nearest Location
                </button>
              </div>
            </div>
            {view === "tree" && (
              <div className="ml-auto flex items-center gap-2">
                <button className="px-3 py-1.5 rounded border text-theme-sm bg-white text-gray-700 border-gray-200 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06]" onClick={() => setExpandControl("expand")}>Expand All</button>
                <button className="px-3 py-1.5 rounded border text-theme-sm bg-white text-gray-700 border-gray-200 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06]" onClick={() => setExpandControl("collapse")}>Collapse All</button>
              </div>
            )}
          </div>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-theme-xs text-gray-700 dark:text-white/80 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onFocus={(e) => { const el = e.currentTarget as any; if (typeof el.showPicker === "function") { try { el.showPicker(); } catch {} } }}
                onClick={(e) => { const el = e.currentTarget as any; if (typeof el.showPicker === "function") { try { el.showPicker(); } catch {} } }}
                className="px-2 py-1 rounded border border-gray-200 text-theme-sm dark:bg-white/[0.12] dark:text-white dark:border-white/[0.12]"
              />
            </div>
            <div>
              <label className="block text-theme-xs text-gray-700 dark:text-white/80 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onFocus={(e) => { const el = e.currentTarget as any; if (typeof el.showPicker === "function") { try { el.showPicker(); } catch {} } }}
                onClick={(e) => { const el = e.currentTarget as any; if (typeof el.showPicker === "function") { try { el.showPicker(); } catch {} } }}
                className="px-2 py-1 rounded border border-gray-200 text-theme-sm dark:bg-white/[0.12] dark:text-white dark:border-white/[0.12]"
              />
            </div>
          </div>
          {/* Tabs: place below controls within the row to reduce empty space */}
          <div className="mt-2">
            <div
              role="tablist"
              aria-label="Data view"
              className="inline-flex rounded-lg border border-gray-200 bg-white/60 shadow-sm overflow-hidden dark:border-white/[0.08] dark:bg-white/[0.05]"
            >
              <button
                role="tab"
                aria-selected={view === "grid"}
                className={`${view === "grid" ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.08]"} px-4 py-2 text-theme-sm border-r border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-white/[0.06]`}
                onClick={() => setView("grid")}
              >
                Grid View
              </button>
              <button
                role="tab"
                aria-selected={view === "tree"}
                className={`${view === "tree" ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.08]"} px-4 py-2 text-theme-sm border-r border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-white/[0.06]`}
                onClick={() => setView("tree")}
              >
                Nested Grid
              </button>
              <button
                role="tab"
                aria-selected={view === "multi"}
                className={`${view === "multi" ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.08]"} px-4 py-2 text-theme-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40`}
                onClick={() => {
                  setView("multi");
                  setLocationHeader("Centurion | Johannesburg | Pretoria");
                }}
              >
                Tree View
              </button>
            </div>
          </div>
        </div>
      </div>
      {view === "grid" ? (
        <BasicTableOne
          rows={rows}
          loading={loading}
          error={error}
          columnOrder={["time", "temperature_2m", "weather_code", "rain", "wind_direction_10m"]}
          columnLabels={{
            time: "Time",
            temperature_2m: "Temp (°C)",
            weather_code: "Weather Code",
            rain: "Rain (mm)",
            wind_direction_10m: "Wind Dir (°)",
          }}
        />
      ) : view === "tree" ? (
        <WeatherTreeView
          rows={rows}
          loading={loading}
          error={error}
          columnOrder={["time", "temperature_2m", "weather_code", "rain", "wind_direction_10m"]}
          columnLabels={{
            time: "Time",
            temperature_2m: "Temp (°C)",
            weather_code: "Weather Code",
            rain: "Rain (mm)",
            wind_direction_10m: "Wind Dir (°)",
          }}
          dayStats={dayStats}
          expandControl={expandControl}
        />
      ) : (
        <MultiLocationTreeView
          locations={multiLocations}
          loading={multiLoading}
          error={multiError}
          expandControl={expandControl}
          columnOrder={["time", "temperature_2m", "weather_code", "rain", "wind_direction_10m"]}
          columnLabels={{
            time: "Time",
            temperature_2m: "Temp (°C)",
            weather_code: "Weather Code",
            rain: "Rain (mm)",
            wind_direction_10m: "Wind Dir (°)",
          }}
        />
      )}
    </div>
  );
}
