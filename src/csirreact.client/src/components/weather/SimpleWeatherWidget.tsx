"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "@/context/LocationContext";
import { useSelectedLocation } from "@/context/SelectedLocationContext";
import { HumidityIcon, WindIcon, SunIcon, MoonIcon } from "@/icons/index";
import CloudIcon from "@/icons/cloud.svg";
import RainIcon from "@/icons/rain.svg";
import SnowIcon from "@/icons/snow.svg";
import FogIcon from "@/icons/fog.svg";

type Props = {
  autoLocate?: "gps" | "ip" | "none";
  lat?: number;
  lon?: number;
};

type WeatherData = {
  location?: string;
  temperature?: number;
  wind?: number;
  humidity?: number;
  isNight?: boolean;
  desc?: string;
  code?: number;
};

async function locateViaIP(): Promise<{ lat: number; lon: number; city?: string } | null> {
  try {
    const res = await fetch("https://ipapi.co/json");
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      return { lat: data.latitude, lon: data.longitude, city: data.city };
    }
  } catch {}
  return null;
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherData | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,is_day,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const current = json.current;
  return {
    temperature: current?.temperature_2m,
    wind: current?.wind_speed_10m,
    humidity: current?.relative_humidity_2m,
    isNight: current?.is_day === 0,
    desc: current?.is_day === 0 ? "Night" : "Day",
    code: current?.weather_code,
  };
}

type HourlyData = {
  time: string[];
  temperature_2m: number[];
  wind_speed_10m: number[];
  relative_humidity_2m: number[];
};

async function fetchHourly(lat: number, lon: number): Promise<HourlyData | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const hourly = json.hourly || {};
  return {
    time: Array.isArray(hourly.time) ? hourly.time : [],
    temperature_2m: Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [],
    wind_speed_10m: Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m : [],
    relative_humidity_2m: Array.isArray(hourly.relative_humidity_2m) ? hourly.relative_humidity_2m : [],
  };
}

export default function SimpleWeatherWidget({ autoLocate = "gps", lat, lon }: Props) {
  const { mode, defaultLat, defaultLon } = useLocation();
  const { selected } = useSelectedLocation();
  const [coords, setCoords] = useState<{ lat: number; lon: number; city?: string } | null>(lat && lon ? { lat, lon } : null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hourly, setHourly] = useState<HourlyData | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Popup is anchored below the card, no viewport clamping

  // Indices for today's hourly entries, computed consistently at top-level
  const todayIndices = React.useMemo(() => {
    if (!hourly) return [] as number[];
    const todayStr = new Date().toDateString();
    return hourly.time
      .map((t, i) => ({ i, d: new Date(t) }))
      .filter((r) => r.d.toDateString() === todayStr)
      .map((r) => r.i);
  }, [hourly]);

  // Removed viewport clamping; modal always renders below the card

  // React to selected location changes from the sidebar context
  useEffect(() => {
    if (selected) {
      setCoords({ lat: selected.lat, lon: selected.lon, city: selected.name });
    }
  }, [selected]);

  // Keep hourly data in sync with current coords and modal state
  useEffect(() => {
    let canceled = false;
    async function syncHourly() {
      if (!coords) return;
      if (showModal) {
        const h = await fetchHourly(coords.lat, coords.lon);
        if (!canceled && h) setHourly(h);
      } else {
        setHourly(null);
      }
    }
    syncHourly();
    return () => { canceled = true; };
  }, [coords?.lat, coords?.lon, showModal]);

  useEffect(() => {
    let canceled = false;
    async function run() {
      try {
        let c: { lat: number; lon: number; city?: string } | null = null;
        // If a selected location exists, prefer it
        if (selected) {
          c = { lat: selected.lat, lon: selected.lon, city: selected.name };
        }
        const preferGPS = autoLocate === "gps";
        const preferIP = autoLocate === "ip";
        if (!c && mode === "default") {
          c = { lat: defaultLat, lon: defaultLon };
        } else if (!c && preferGPS && typeof navigator !== "undefined" && navigator.geolocation) {
          c = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 5000 }
            );
          });
          if (!c) {
            c = await locateViaIP();
          }
        } else if (!c && (preferIP || mode === "nearest")) {
          c = await locateViaIP();
        }
        if (!c) {
          throw new Error("Unable to determine location.");
        }
        if (!canceled) setCoords(c);
        const w = await fetchOpenMeteo(c.lat, c.lon);
        if (!w) throw new Error("Failed to fetch weather.");
        if (!canceled) setData({ ...w, location: c.city });
      } catch (e: any) {
        if (!canceled) setError(e?.message || "Weather unavailable.");
      }
    }
    run();
    return () => {
      canceled = true;
    };
  }, [autoLocate, lat, lon, mode, defaultLat, defaultLon, selected]);

  const containerBg = "bg-blue-50 dark:bg-gray-900/70";

  if (error) {
    return (
      <div className="rounded-md border border-red-300 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!data) {
    return <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">Loading weather…</div>;
  }

  return (
    <div className="relative w-full">
      <div
        className={`rounded-xl border ${containerBg} p-4 border-gray-200 dark:border-gray-600 cursor-pointer`}
        ref={cardRef}
        onClick={async () => {
          if (showModal) return;
          setShowModal(true);
          if (!hourly && coords) {
            const h = await fetchHourly(coords.lat, coords.lon);
            if (h) setHourly(h);
          }
        }}
      >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
            {selected?.name || data.location || "Pretoria"}
          </h2>
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-5">{data.desc}</p>
        </div>
        <div className="shrink-0 text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white leading-none">
          {Math.round(data.temperature ?? 0)}
          <span className="align-super text-sm md:text-base text-gray-600 dark:text-gray-300">°C</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="min-w-0 rounded-lg border p-2 bg-white/90 dark:bg-gray-800/80 border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-center gap-1 font-medium text-gray-900 dark:text-white text-[12px] leading-4">
            <WindIcon className="w-4 h-4 text-sky-500" />
            <span>Wind</span>
          </div>
          <div className="text-gray-700 dark:text-gray-200 text-[11px] leading-4">{Math.round(data.wind ?? 0)} km/h</div>
        </div>
        <div className="min-w-0 rounded-lg border p-2 bg-white/90 dark:bg-gray-800/80 border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-center gap-1 font-medium text-gray-900 dark:text-white text-[12px] leading-4">
            <HumidityIcon className="w-4 h-4 text-blue-500" />
            <span>Humidity</span>
          </div>
          <div className="text-gray-700 dark:text-gray-200 text-[11px] leading-4">{Math.round(data.humidity ?? 0)}%</div>
        </div>
        <div className="min-w-0 rounded-lg border p-2 bg-white/90 dark:bg-gray-800/80 border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-center gap-1 font-medium text-gray-900 dark:text-white text-[12px] leading-4">
            {(() => {
              const code = data.code ?? 0;
              const isNight = !!data.isNight;
              const isCloud = code >= 1 && code <= 3;
              const isFog = code === 45 || code === 48;
              const isDrizzle = code >= 51 && code <= 57;
              const isRain = (code >= 61 && code <= 67) || (code >= 80 && code <= 82);
              const isSnow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
              const isThunder = code === 95 || code === 96 || code === 99;
              const iconClass = isThunder
                ? "text-yellow-500"
                : isSnow
                ? "text-cyan-500"
                : isRain || isDrizzle
                ? "text-blue-500"
                : isFog
                ? "text-gray-400"
                : isCloud
                ? "text-gray-500"
                : isNight
                ? "text-indigo-500"
                : "text-amber-500";
              if (isThunder) return <span className={"w-4 h-4 " + iconClass}><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3L6 14h5l-2 7 8-12h-5l1-6z" fill="currentColor"/></svg></span>;
              if (isSnow) return <SnowIcon className={"w-4 h-4 " + iconClass} />;
              if (isRain) return <RainIcon className={"w-4 h-4 " + iconClass} />;
              if (isDrizzle) return <RainIcon className={"w-4 h-4 " + iconClass} />;
              if (isFog) return <FogIcon className={"w-4 h-4 " + iconClass} />;
              if (isCloud) return <CloudIcon className={"w-4 h-4 " + iconClass} />;
              return isNight ? <MoonIcon className={"w-4 h-4 " + iconClass} /> : <SunIcon className={"w-4 h-4 " + iconClass} />;
            })()}
            <span>Status</span>
          </div>
          <div className="text-gray-700 dark:text-gray-200 text-[11px] leading-4">
            {(() => {
              const code = data.code ?? 0;
              const isNight = !!data.isNight;
              const label = code === 0
                ? (isNight ? "Clear Night" : "Clear Day")
                : (code >= 1 && code <= 3) ? "Cloudy"
                : (code === 45 || code === 48) ? "Fog"
                : (code >= 51 && code <= 57) ? "Drizzle"
                : ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) ? "Rain"
                : ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) ? "Snow"
                : (code === 95 || code === 96 || code === 99) ? "Thunder"
                : (isNight ? "Night" : "Day");
              return label;
            })()}
          </div>
        </div>
      </div>
      </div>
      {showModal && (
        <div className="absolute left-0 top-full mt-2 z-[60] w-auto min-w-[300px] sm:w-[420px] md:w-[560px] lg:w-[680px] max-w-[calc(100vw-32px)]" onClick={(e) => e.stopPropagation()}>
          <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 shadow-xl min-h-[160px]"
               role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Hourly Forecast</h3>
              <button className="text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200" onClick={() => setShowModal(false)}>Close</button>
            </div>
            {hourly ? (
              <div className="overflow-y-auto overflow-x-auto scroll-area max-h-[320px]">
                <table className="w-full min-w-[360px] text-sm table-fixed">
                  <thead>
                    <tr className="text-gray-900 dark:text-gray-300">
                      <th className="text-left py-2 w-20 sm:w-16 whitespace-nowrap">Time</th>
                      <th className="text-right py-2 w-14 sm:w-12 whitespace-nowrap">Temperature</th>
                      <th className="text-right py-2 w-20 sm:w-16 whitespace-nowrap">Wind</th>
                      <th className="text-right py-2 w-20 sm:w-16 whitespace-nowrap">Humidity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayIndices.map((i) => (
                      <tr key={hourly.time[i]} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">{new Date(hourly.time[i]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-gray-200 whitespace-nowrap">{Math.round(hourly.temperature_2m[i] ?? 0)}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-gray-200 whitespace-nowrap">{Math.round(hourly.wind_speed_10m[i] ?? 0)}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-gray-200 whitespace-nowrap">{Math.round(hourly.relative_humidity_2m[i] ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300">Loading hourly data…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
