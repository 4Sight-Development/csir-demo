import React, { useMemo, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";

type BasicTableOneProps = {
  rows?: Array<Record<string, any>>;
  loading?: boolean;
  error?: string | null;
  columnOrder?: string[];
  columnLabels?: Record<string, string>;
};

export default function BasicTableOne({
  rows = [],
  loading = false,
  error = null,
  columnOrder,
  columnLabels = {},
}: BasicTableOneProps) {
  const pageSize = 10;
  const [page, setPage] = useState<number>(1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    // Reset and clamp page when data changes
    setPage((p) => {
      const clamped = Math.min(Math.max(1, p), totalPages);
      return clamped;
    });
  }, [totalPages]);
  const columns = useMemo(() => {
    if (!rows || rows.length === 0) return [] as string[];
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => set.add(k)));
    const discovered = Array.from(set);
    if (columnOrder && columnOrder.length) {
      const ordered = columnOrder.filter((c) => set.has(c));
      const remaining = discovered.filter((c) => !columnOrder.includes(c));
      return [...ordered, ...remaining];
    }
    return discovered;
  }, [rows, columnOrder]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return rows.slice(start, end);
  }, [rows, page]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/[0.08] dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[900px]">
          {loading ? (
            <div className="p-6 text-gray-500 text-theme-sm dark:text-gray-400">Loading…</div>
          ) : error ? (
            <div className="p-6 text-red-600 text-theme-sm">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-gray-500 text-theme-sm dark:text-gray-400">No data available.</div>
          ) : (
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
                {pagedRows.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className="odd:bg-white even:bg-gray-200 hover:bg-brand-50/60 hover:ring-1 hover:ring-brand-500/30 transition-all dark:odd:bg-white/[0.14] dark:even:bg-white/[0.08] dark:hover:bg-white/[0.10] dark:hover:ring-white/15"
                  >
                    {columns.map((col) => {
                      const value = row?.[col];
                      let display: string = "";
                      if (value == null) {
                        display = "";
                      } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
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
          )}
        </div>
      </div>
      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white/40 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:border-white/[0.06]">
          <div>
            Rows {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06] dark:hover:bg-white/[0.08]"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="px-2">Page {page} / {totalPages}</span>
            <button
              className="px-3 py-1.5 rounded border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:bg-white/[0.06] dark:text-gray-200 dark:border-white/[0.06] dark:hover:bg-white/[0.08]"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
