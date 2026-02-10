import React, { useMemo, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useSelectedLocation } from "@/context/SelectedLocationContext";

export type MultiLocationTreeViewProps = {
  locations: Array<{
    name: string;
    header?: string | null;
    rows: Array<Record<string, any>>;
    days: Array<{ DateText?: string; TempMin?: number | null; TempMax?: number | null; RainAvg?: number | null; Count?: number }>;
  }>;
  loading?: boolean;
  error?: string | null;
  columnOrder?: string[];
  columnLabels?: Record<string, string>;
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
  return parts[1] ?? time; // 24-hour ISO time part
}

export default function MultiLocationTreeView({
  locations = [],
  loading = false,
  error = null,
  columnOrder,
  columnLabels = {},
  expandControl = null,
}: MultiLocationTreeViewProps) {
  const { setSelected } = useSelectedLocation();
  const pageSize = 10;
  const coordsMap: Record<string, { lat: number; lon: number }> = {
    Centurion: { lat: -25.86, lon: 28.19 },
    Johannesburg: { lat: -26.2, lon: 28.05 },
    Pretoria: { lat: -25.75, lon: 28.19 },
  };

  const [lastExpandedName, setLastExpandedName] = useState<string | null>(null);
  useEffect(() => {
    if (lastExpandedName && coordsMap[lastExpandedName]) {
      const m = coordsMap[lastExpandedName];
      setSelected({ name: lastExpandedName, lat: m.lat, lon: m.lon });
    }
  }, [lastExpandedName, setSelected]);

  const columns = useMemo(() => {
    if (columnOrder && columnOrder.length) return columnOrder;
    const set = new Set<string>();
    locations.forEach((loc) => {
      (loc.rows || []).forEach((r) => Object.keys(r || {}).forEach((k) => set.add(k)));
    });
    return Array.from(set);
  }, [locations, columnOrder]);

  const grouped = useMemo(() => {
    return locations.map((loc) => {
      const map = new Map<string, Array<Record<string, any>>>();
      (loc.rows || []).forEach((r) => {
        const key = getDatePart(r?.time) || "Unknown";
        const arr = map.get(key) ?? [];
        arr.push(r);
        map.set(key, arr);
      });
      const groups = Array.from(map.entries()).map(([date, items]) => ({ date, items }));
      return { name: loc.name, header: loc.header ?? null, groups, days: loc.days ?? [] };
    });
  }, [locations]);

  const [expandedLoc, setExpandedLoc] = useState<Record<string, boolean>>({});
  const [expandedDay, setExpandedDay] = useState<Record<string, boolean>>({});
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedRoot, setExpandedRoot] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    setExpandedLoc((prev) => {
      const next = { ...prev };
      grouped.forEach((g) => {
        if (next[g.name] === undefined) next[g.name] = false;
      });
      return next;
    });
  }, [grouped]);

  useEffect(() => {
    if (!expandControl) return;
    setExpandedRoot(expandControl === "expand");
    setExpandedLoc((prev) => {
      const next = { ...prev };
      grouped.forEach((g) => {
        next[g.name] = expandControl === "expand";
      });
      return next;
    });
    setExpandedDay((prev) => {
      const next = { ...prev };
      grouped.forEach((g) => g.groups.forEach((d) => {
        next[`${g.name}:${d.date}`] = expandControl === "expand";
      }));
      return next;
    });
  }, [expandControl, grouped]);

  const statsMapByLoc = useMemo(() => {
    const out = new Map<string, Map<string, { min?: number | null; max?: number | null; avg?: number | null; count?: number }>>();
    grouped.forEach((g) => {
      const inner = new Map<string, { min?: number | null; max?: number | null; avg?: number | null; count?: number }>();
      (g.days || []).forEach((d: any) => {
        const dateKey: string | undefined = d?.DateText ?? d?.dateText;
        if (!dateKey) return;
        const min = d?.TempMin ?? d?.tempMin ?? null;
        const max = d?.TempMax ?? d?.tempMax ?? null;
        const avg = d?.RainAvg ?? d?.rainAvg ?? null;
        const count = d?.Count ?? d?.count ?? undefined;
        inner.set(dateKey, { min, max, avg, count });
      });
      if (inner.size === 0) {
        g.groups.forEach((day) => {
          const tempsDay = day.items
            .map((r) => (typeof r?.temperature_2m === "number" ? (r.temperature_2m as number) : null))
            .filter((v): v is number => v != null);
          const rainsDay = day.items
            .map((r) => (typeof r?.rain === "number" ? (r.rain as number) : null))
            .filter((v): v is number => v != null);
          inner.set(day.date, {
            min: tempsDay.length ? Math.min(...tempsDay) : null,
            max: tempsDay.length ? Math.max(...tempsDay) : null,
            avg: rainsDay.length ? rainsDay.reduce((a, b) => a + b, 0) / rainsDay.length : null,
            count: day.items.length,
          });
        });
      }
      out.set(g.name, inner);
    });
    return out;
  }, [grouped]);

  const selectedRows: Array<Record<string, any>> = useMemo(() => {
    if (!selectedLoc || !selectedDate) return [];
    const g = grouped.find((x) => x.name === selectedLoc);
    const d = g?.groups.find((x) => x.date === selectedDate);
    return d?.items ?? [];
  }, [grouped, selectedLoc, selectedDate]);

  useEffect(() => {
    // Reset page when selection changes
    setPage(1);
  }, [selectedLoc, selectedDate]);

  const pagedSelectedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return selectedRows.slice(start, end);
  }, [selectedRows, page]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/[0.08] dark:border-white/[0.05] dark:bg-white/[0.03]">
      {loading ? (
        <div className="p-6 text-gray-500 text-theme-sm dark:text-gray-400">Loading…</div>
      ) : error ? (
        <div className="p-6 text-red-600 text-theme-sm">{error}</div>
      ) : !locations.length ? (
        <div className="p-6 text-gray-500 text-theme-sm dark:text-gray-400">No data available.</div>
      ) : (
        <div className="flex flex-col md:flex-row">
          {/* Left Tree */}
          <div className="md:w-72 lg:w-80 w-full shrink-0 border-r border-gray-100 dark:border-white/[0.06] p-2 md:p-3 bg-white/60 dark:bg-white/[0.02]">
            <div className="space-y-1" role="tree" aria-label="Locations">
              {/* Root: Locations */}
              <div>
                <button
                  className="w-full group flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50/60 text-gray-800 hover:bg-gray-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-white/90 dark:hover:bg-white/[0.08]"
                  onClick={() => setExpandedRoot((prev) => !prev)}
                  aria-expanded={expandedRoot}
                  role="treeitem"
                >
                  <svg className={`h-4 w-4 text-gray-500 transition-transform ${expandedRoot ? "rotate-90" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l6 6-6 6" /></svg>
                  <span className="font-semibold text-theme-sm">Locations</span>
                </button>
                {expandedRoot && (
                  <div className="relative ml-6 pl-2 space-y-1 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:bg-gray-200 dark:before:bg-white/[0.06]">
                    {grouped.map((loc) => (
                      <div key={loc.name}>
                        <button
                          className={`w-full group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-white/[0.06] ${expandedLoc[loc.name] ? "bg-brand-50/30 dark:bg-white/[0.05]" : ""}`}
                          onClick={() => {
                            setExpandedLoc((prev) => {
                              const willExpand = !prev[loc.name];
                              if (willExpand) setLastExpandedName(loc.name);
                              return { ...prev, [loc.name]: willExpand };
                            });
                            setSelectedLoc(loc.name);
                          }}
                          aria-expanded={!!expandedLoc[loc.name]}
                          role="treeitem"
                        >
                          <svg className={`h-4 w-4 text-gray-500 transition-transform ${expandedLoc[loc.name] ? "rotate-90" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l6 6-6 6" /></svg>
                          <span className="inline-flex items-center gap-2 text-gray-800 text-theme-sm dark:text-white/90">
                            {/* map-pin icon */}
                            <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 12 6 12s6-6.75 6-12c0-3.314-2.686-6-6-6Zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>
                            <span>{loc.header ?? loc.name}</span>
                          </span>
                        </button>
                        {expandedLoc[loc.name] && (
                          <div className="relative ml-6 pl-2 space-y-1 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:bg-gray-200 dark:before:bg-white/[0.06]">
                            {loc.groups.map((group) => {
                              const key = `${loc.name}:${group.date}`;
                              return (
                                <button
                                  key={key}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-white/[0.06] ${selectedLoc === loc.name && selectedDate === group.date ? "bg-brand-50/50 ring-1 ring-brand-500/30 dark:bg-white/[0.08]" : ""}`}
                                  onClick={() => {
                                    setSelectedLoc(loc.name);
                                    setSelectedDate(group.date);
                                    setExpandedDay((prev) => ({ ...prev, [key]: true }));
                                    const m = coordsMap[loc.name];
                                    if (m) setSelected({ name: loc.name, lat: m.lat, lon: m.lon });
                                  }}
                                  role="treeitem"
                                >
                                  <span className="inline-flex items-center gap-2 text-gray-800 text-theme-sm dark:text-white/90">
                                    {/* small calendar icon */}
                                    <svg className="h-4 w-4 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 1 1 2 0v1Zm13 7H4v10h16V9Z"/></svg>
                                    <span>{group.date}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Grid */}
          <div className="flex-1 min-w-0 p-2 md:p-4">
            {selectedLoc && selectedDate ? (
              <div className="rounded-lg border border-gray-100 dark:border-white/[0.06] overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-theme-sm text-gray-700 dark:bg-white/[0.05] dark:text-gray-200 dark:border-white/[0.06]">
                  {selectedLoc} — {selectedDate}
                </div>
                <div className="max-w-full overflow-x-auto">
                  <div className="min-w-[720px]">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 border-b border-gray-100 bg-gradient-to-r from-brand-500/12 to-brand-600/12 backdrop-blur supports-[backdrop-filter]:bg-brand-500/10 dark:border-white/[0.06] dark:from-brand-400/15 dark:to-brand-500/15">
                        <TableRow>
                          {columns.map((col) => (
                            <TableCell key={col} isHeader className="px-5 py-3 font-semibold uppercase tracking-wide text-gray-700 text-start text-theme-xs dark:text-white/80">
                              {columnLabels?.[col] ?? col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {pagedSelectedRows.map((row, idx) => (
                          <TableRow key={idx} className="odd:bg-white even:bg-gray-200 hover:bg-brand-50/60 hover:ring-1 hover:ring-brand-500/30 transition-all dark:odd:bg-white/[0.14] dark:even:bg-white/[0.08] dark:hover:bg-white/[0.10] dark:hover:ring-white/15">
                            {columns.map((col) => {
                              const value = row?.[col];
                              let display = "";
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
                        ))}
                      </TableBody>
                    </Table>
                    {/* Pagination */}
                    {selectedRows.length > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white/40 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:border-white/[0.06]">
                        <div>
                          Rows {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, selectedRows.length)} of {selectedRows.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 rounded border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06] dark:hover:bg-white/[0.08]"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                          >
                            Prev
                          </button>
                          <span className="px-2">Page {page} / {Math.max(1, Math.ceil(selectedRows.length / pageSize))}</span>
                          <button
                            className="px-3 py-1.5 rounded border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06] dark:hover:bg-white/[0.08]"
                            disabled={page >= Math.ceil(selectedRows.length / pageSize)}
                            onClick={() => setPage((p) => Math.min(Math.ceil(selectedRows.length / pageSize), p + 1))}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 text-gray-600 dark:text-gray-300">Select a day from the tree</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}