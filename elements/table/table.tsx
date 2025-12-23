import React, { useMemo, useState } from "react";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  widthClassName?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T, rowIndex: number) => React.ReactNode;
  field?: keyof T;
  sortValue?: (row: T) => string | number;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T, rowIndex: number) => string;

  loading?: boolean;
  emptyText?: string;

  onRowClick?: (row: T) => void;

  // Selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;

  // UI
  className?: string;
  containerClassName?: string;
  maxHeightClassName?: string; // vd: "max-h-[520px]"
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function compare(a: any, b: any) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function Table<T>({
  columns,
  data,
  getRowId,
  loading = false,
  emptyText = "Không có dữ liệu",
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectedIdsChange,
  className,
  containerClassName,
  maxHeightClassName = "max-h-[520px]",
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const resolvedSelectedIds = selectedIds ?? [];
  const allRowIds = useMemo(() => data.map(getRowId), [data, getRowId]);

  const isAllSelected =
    selectable &&
    data.length > 0 &&
    resolvedSelectedIds.length === data.length &&
    resolvedSelectedIds.every((id) => allRowIds.includes(id));

  const isSomeSelected =
    selectable && resolvedSelectedIds.length > 0 && !isAllSelected;

  const sortedData = useMemo(() => {
    if (!sort) return data;

    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;

    const dirMul = sort.dir === "asc" ? 1 : -1;

    return [...data].sort((ra, rb) => {
      const va =
        col.sortValue?.(ra) ?? (col.field ? (ra as any)[col.field] : undefined);
      const vb =
        col.sortValue?.(rb) ?? (col.field ? (rb as any)[col.field] : undefined);
      return compare(va, vb) * dirMul;
    });
  }, [data, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const toggleRow = (rowId: string) => {
    if (!onSelectedIdsChange) return;
    const set = new Set(resolvedSelectedIds);
    if (set.has(rowId)) set.delete(rowId);
    else set.add(rowId);
    onSelectedIdsChange(Array.from(set));
  };

  const toggleAll = () => {
    if (!onSelectedIdsChange) return;
    if (isAllSelected) onSelectedIdsChange([]);
    else onSelectedIdsChange(allRowIds);
  };

  return (
    <div className={cx("w-full", className)}>
      {/* Scroll container (body scroll, header fixed) */}
      <div
        className={cx(
          "overflow-hidden rounded-xl border border-slate-200 bg-white",
          "dark:border-slate-700 dark:bg-slate-900",
          containerClassName
        )}
      >
        <div className={cx("overflow-auto", maxHeightClassName)}>
          <table className="min-w-full border-separate border-spacing-0">
            {/* HEADER */}
            <thead className="sticky top-0 z-20">
              <tr
                className={cx(
                  "bg-slate-100 text-left text-sm font-semibold text-slate-700",
                  "dark:bg-slate-800 dark:text-slate-200",
                  // shadow dưới header
                  "shadow-[0_2px_0_0_rgba(15,23,42,0.08)] dark:shadow-[0_2px_0_0_rgba(0,0,0,0.35)]"
                )}
              >
                {selectable && (
                  <th className="px-3 py-3 border-b border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = Boolean(isSomeSelected);
                      }}
                      onChange={toggleAll}
                      className="size-4 accent-blue-600"
                    />
                  </th>
                )}

                {columns.map((col) => {
                  const align =
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                        ? "text-right"
                        : "text-left";

                  const isSorted = sort?.key === col.key;
                  const sortIcon = isSorted
                    ? sort?.dir === "asc"
                      ? "▲"
                      : "▼"
                    : "";

                  return (
                    <th
                      key={col.key}
                      className={cx(
                        "px-4 py-3 border-b border-slate-200 dark:border-slate-700",
                        "bg-slate-100 dark:bg-slate-800",
                        col.widthClassName,
                        align,
                        col.sortable && "cursor-pointer select-none"
                      )}
                      onClick={() => col.sortable && toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-2">
                        {col.header}
                        {col.sortable && (
                          <span className="text-xs text-slate-400 dark:text-slate-400">
                            {sortIcon}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="text-sm text-slate-800 dark:text-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rowIndex) => {
                  const rowId = getRowId(row, rowIndex);
                  const clickable = Boolean(onRowClick);
                  const isSelected =
                    selectable && resolvedSelectedIds.includes(rowId);

                  // Zebra + selected highlight
                  const zebra =
                    rowIndex % 2 === 0
                      ? "bg-white dark:bg-slate-900"
                      : "bg-slate-50 dark:bg-slate-900/60";

                  const selectedStyle = isSelected
                    ? "bg-blue-50 dark:bg-blue-950/40"
                    : zebra;

                  return (
                    <tr
                      key={rowId}
                      className={cx(
                        "border-b border-slate-200 dark:border-slate-700",
                        selectedStyle,
                        // hover + transition
                        clickable && "cursor-pointer",
                        "transition-colors duration-200",
                        "hover:bg-slate-100 dark:hover:bg-slate-800/70"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <td
                          className="px-3 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(rowId)}
                            className="size-4 accent-blue-600"
                          />
                        </td>
                      )}

                      {columns.map((col) => {
                        const align =
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                              ? "text-right"
                              : "text-left";

                        const content =
                          col.render?.(row, rowIndex) ??
                          (col.field
                            ? String((row as any)[col.field] ?? "")
                            : "");

                        return (
                          <td
                            key={col.key}
                            className={cx("px-4 py-3", align)}
                            title={
                              typeof content === "string" ? content : undefined
                            }
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
