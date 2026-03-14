"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

type DataTableProps<TData> = {
  /** Колонки таблицы */
  columns: ColumnDef<TData, unknown>[];
  /** Данные одной страницы (серверная пагинация) */
  data: TData[];
  /** Уникальный ключ строки (для getRowId) */
  getRowId?: (row: TData) => string | number;
  /** Текст при пустом списке */
  emptyMessage?: string;
  /** Дополнительные классы для контейнера (по макету Figma) */
  className?: string;
  /** Дополнительные классы для каждой строки (например "group" для group-hover) */
  rowClassName?: string;
};

/**
 * Универсальная таблица на TanStack Table: только отображение (без встроенной пагинации/сортировки).
 * Пагинация и поиск управляются снаружи через useQuery.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  emptyMessage = "Нет данных",
  className,
  rowClassName,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(), // дефолтная реализация из @tanstack/react-table
    // API таблицы: getRowId(originalRow, index, parent?) => string
    getRowId: getRowId
      ? (originalRow, index) =>
          originalRow != null ? String(getRowId(originalRow)) : String(index)
      : undefined,
  });

  // Стили по макету Figma: фон #f6f6f6, скругление 8px, текст #333333, строки 32px по высоте контента
  return (
    <div
      className={
        "overflow-hidden rounded-lg bg-[#f6f6f6] " + (className ?? "")
      }
    >
      <table className="w-full text-sm">
        <thead className="bg-[#f6f6f6]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-left px-3 py-2 font-medium text-[#333333]"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-4 text-center text-[#333333]/70"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={
                  "border-t border-[#e5e5e5] " + (rowClassName ?? "")
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-3 py-2 text-[#333333] leading-6"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
