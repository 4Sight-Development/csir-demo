import React, { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";

type WeatherTreeViewProps = {
  rows?: Array<Record<string, any>>;
  loading?: boolean;
  error?: string | null;
  columnOrder?: string[];
  columnLabels?: Record<string, string>;
  dayStats?: Array<{ DateText?: string; TempMin?: number | null; TempMax?: number | null; RainAvg?: number | null; Count?: number }>;
  expandControl?: "expand" | "collapse" | null;
};

function getDatePart(time: unknown): string {
  if (typeof time !== "string") return "";
  const [date] = time.split("T");
  return date || time;
}

function getHourPart(time: unknown): string {
  if (typeof time !== "string") return String(time ?? "");
  const parts = time.split("T");
  return parts[1] ?? time;
}

export default function WeatherTreeView({
  rows = [],
  loading = false,
  error = null,
  columnOrder,
  columnLabels = {},
  dayStats = [],
  expandControl = null,
}: WeatherTreeViewProps) {
  const pageSize = 10;
  const columns = useMemo(() => {
    if (columnOrder && columnOrder.length) return columnOrder;
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [rows, columnOrder]);

  const groups = useMemo(() => {
    const map = new Map<string, Array<Record<string, any>>>();
    rows.forEach((r) => {
      const key = getDatePart(r?.time) || "Unknown";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    });
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [rows]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pageByDate, setPageByDate] = useState<Record<string, number>>({});
  useEffect(() => {
    setExpanded((prev) => {
      const next: Record<string, boolean> = { ...prev };
      groups.forEach((g) => {
        if (next[g.date] === undefined) next[g.date] = false;
      });
      return next;
    });
    setPageByDate((prev) => {
      const next: Record<string, number> = { ...prev };
      groups.forEach((g) => {
        if (next[g.date] === undefined) next[g.date] = 1;
      });
      return next;
    });
  }, [groups]);

  useEffect(() => {
    if (!expandControl) return;
    setExpanded((prev) => {
      const next: Record<string, boolean> = { ...prev };
      groups.forEach((g) => {
        next[g.date] = expandControl === "expand";
      });
      return next;
    });
  }, [expandControl, groups]);

  const statsMap = useMemo(() => {
    const map = new Map<string, { min?: number | null; max?: number | null; avg?: number | null; count?: number }>();
    dayStats?.forEach((d) => {
      if (d?.DateText) map.set(d.DateText, { min: d.TempMin ?? null, max: d.TempMax ?? null, avg: d.RainAvg ?? null, count: d.Count ?? undefined });
    });
    // Fallback compute on client if no stats provided
    if (map.size === 0) {
      groups.forEach((g) => {
        const tempsDay = g.items
          .map((r) => (typeof r?.temperature_2m === "number" ? (r.temperature_2m as number) : null))
          .filter((v): v is number => v != null);
        const rainsDay = g.items
          .map((r) => (typeof r?.rain === "number" ? (r.rain as number) : null))
          .filter((v): v is number => v != null);
        map.set(g.date, {
          min: tempsDay.length ? Math.min(...tempsDay) : null,
          max: tempsDay.length ? Math.max(...tempsDay) : null,
          avg: rainsDay.length ? rainsDay.reduce((a, b) => a + b, 0) / rainsDay.length : null,
          count: g.items.length,
        });
      });
    }
    return map;
  }, [dayStats, groups]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/[0.08] dark:border-white/[0.05] dark:bg-white/[0.03]">
      {loading ? (
        <div className="p-6 text-gray-500 text-theme-sm dark:text-gray-400">Loading…</div>
      ) : error ? (
        <div className="p-6 text-red-600 text-theme-sm">{error}</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-gray-500 text-theme-sm dark:text-gray-400">No data available.</div>
      ) : (
        <div>
          {groups.map((group) => (
            <div key={group.date} className="border-b border-gray-100 last:border-b-0 dark:border-white/[0.06]">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-brand-500/10 to-transparent hover:from-brand-500/15 hover:bg-gray-50 border border-gray-100 dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
                onClick={() => setExpanded((prev) => ({ ...prev, [group.date]: !prev[group.date] }))}
              >
                <span className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">{group.date}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-theme-xs dark:bg-white/[0.08] dark:text-gray-200">
                  {typeof statsMap.get(group.date)?.min === "number" ? `Min ${statsMap.get(group.date)?.min}°C` : ""}
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-theme-xs dark:bg-white/[0.08] dark:text-gray-200">
                  {typeof statsMap.get(group.date)?.max === "number" ? `Max ${statsMap.get(group.date)?.max}°C` : ""}
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-theme-xs dark:bg-white/[0.08] dark:text-gray-200">
                  {typeof statsMap.get(group.date)?.avg === "number"
                    ? `Avg Rain ${Math.abs(Number(statsMap.get(group.date)?.avg ?? 0)) < 1e-6 ? 0 : Number(statsMap.get(group.date)?.avg).toFixed(4)} mm`
                    : ""}
                </span>
                <span className={`ml-auto transition-transform ${expanded[group.date] ? "rotate-180" : ""}`}>
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <div className={`transition-all ${expanded[group.date] ? "block" : "hidden"}`}>
                <div className="max-w-full overflow-x-auto">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 border-b border-gray-100 bg-gradient-to-r from-brand-500/12 to-brand-600/12 backdrop-blur supports-[backdrop-filter]:bg-brand-500/10 dark:border-white/[0.06] dark:from-brand-400/15 dark:to-brand-500/15">
                        <TableRow>
                          {columns.map((col) => (
                            <TableCell
                              key={col}
                              isHeader
                              className="px-5 py-3 font-semibold uppercase tracking-wide text-gray-700 text-start text-theme-xs dark:text-white/80"
                            >
                              {columnLabels[col] ?? col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {(() => {
                          const page = pageByDate[group.date] ?? 1;
                          const total = group.items.length;
                          const totalPages = Math.max(1, Math.ceil(total / pageSize));
                          const start = (page - 1) * pageSize;
                          const end = Math.min(total, start + pageSize);
                          const items = group.items.slice(start, end);
                          return items.map((row, idx) => (
                          <TableRow
                            key={idx}
                            className="odd:bg-white even:bg-gray-200 hover:bg-brand-50/60 hover:ring-1 hover:ring-brand-500/30 transition-all dark:odd:bg-white/[0.14] dark:even:bg-white/[0.08] dark:hover:bg-white/[0.10] dark:hover:ring-white/15"
                          >
                            {columns.map((col) => {
                              const value = row?.[col];
                              let display: string = "";
                              if (col === "time") {
                                display = getHourPart(value);
                              } else if (value == null) {
                                display = "";
                              } else if (
                                typeof value === "string" ||
                                typeof value === "number" ||
                                typeof value === "boolean"
                              ) {
                                display = String(value);
                              } else if (Array.isArray(value)) {
                                display = value.join(", ");
                              } else if (typeof value === "object") {
                                display = JSON.stringify(value);
                              } else {
                                display = String(value);
                              }
                              return (
                                <TableCell key={col} className="px-4 py-3 text-gray-800 text-start text-theme-sm whitespace-nowrap dark:text-gray-200">
                                  {display}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ));
                        })()}
                      </TableBody>
                    </Table>
                    {/* Pagination per day */}
                    {group.items.length > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white/40 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:border-white/[0.06]">
                        {(() => {
                          const page = pageByDate[group.date] ?? 1;
                          const total = group.items.length;
                          const totalPages = Math.max(1, Math.ceil(total / pageSize));
                          const start = (page - 1) * pageSize + 1;
                          const end = Math.min(total, page * pageSize);
                          return (
                            <>
                              <div>
                                Rows {start}–{end} of {total}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="px-3 py-1.5 rounded border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06] dark:hover:bg-white/[0.08]"
                                  disabled={page <= 1}
                                  onClick={() => setPageByDate((prev) => ({ ...prev, [group.date]: Math.max(1, page - 1) }))}
                                >
                                  Prev
                                </button>
                                <span className="px-2">Page {page} / {totalPages}</span>
                                <button
                                  className="px-3 py-1.5 rounded border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06] dark:hover:bg-white/[0.08]"
                                  disabled={page >= totalPages}
                                  onClick={() => setPageByDate((prev) => ({ ...prev, [group.date]: Math.min(totalPages, page + 1) }))}
                                >
                                  Next
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
