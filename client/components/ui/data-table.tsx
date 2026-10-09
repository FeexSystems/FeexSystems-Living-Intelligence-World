/**
 * DataTable — sortable, filterable, paginated, selectable table.
 * (Task 60, Sprint 15, Phase 4 of docs/FRONTEND_MODERNIZATION_PLAN.md)
 *
 * Built on `@tanstack/react-table` headless primitives and the existing
 * `client/components/ui/table.tsx` styling layer, so visuals match the rest
 * of the sovereign HUD design system (glass surfaces, phosphor focus rings).
 *
 * Accessibility contract:
 * - `<th>` carries `aria-sort` reflecting the current sort direction.
 * - Sort headers are real `<button>`s inside `<th>` (keyboard reachable, Enter/Space).
 * - The selection column exposes an accessible name for both header and row checkboxes.
 * - Pagination controls are labelled buttons with `aria-label` + disabled state.
 * - The table container scrolls horizontally on narrow viewports instead of clipping.
 */

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Shared glass surface used by the table frame and its controls. */
const GLASS_SURFACE =
  "backdrop-blur-xl bg-white/5 border border-white/15 rounded-lg";

/** Accessible, keyboard-operable sort header cell. */
function SortableHeader<TData, TValue>({
  column,
  children,
}: {
  column: import("@tanstack/react-table").Column<TData, TValue>;
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  const ariaSort =
    sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none";

  return (
    <TableHead aria-sort={ariaSort}>
      <button
        type="button"
        onClick={column.getToggleSortingHandler()}
        className="inline-flex items-center gap-1 font-medium transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hud-phosphor,#00ff66)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm"
        aria-label={`Sort by ${String(children)}`}
      >
        {children}
        <ArrowUpDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      </button>
    </TableHead>
  );
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Text shown when no rows match the current filter. */
  emptyMessage?: string;
  /** Column id used by the global filter input. Omit to hide the filter. */
  filterColumnId?: string;
  /** Placeholder for the filter input. */
  filterPlaceholder?: string;
  /** Enables the leading row-selection checkbox column. */
  enableRowSelection?: boolean;
  /** Enables pagination controls. */
  enablePagination?: boolean;
  /** Rows per page when pagination is enabled. */
  pageSize?: number;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = "No results.",
  filterColumnId,
  filterPlaceholder = "Filter…",
  enableRowSelection = false,
  enablePagination = false,
  pageSize = 10,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  // Prepend a selection column when row selection is requested.
  const resolvedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableRowSelection) return columns;

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows on this page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select row ${row.index + 1}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    enableRowSelection,
  });

  const columnLabels = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((c) => c.getCanHide())
        .map((c) => ({ id: c.id, label: c.id })),
    [table],
  );

  const [visibilityOpen, setVisibilityOpen] = React.useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar: filter + column visibility */}
      {(filterColumnId || columnLabels.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {filterColumnId && (
            <Input
              value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(filterColumnId)?.setFilterValue(event.target.value)
              }
              placeholder={filterPlaceholder}
              aria-label={filterPlaceholder}
              className="max-w-xs"
            />
          )}

          {columnLabels.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibilityOpen((open) => !open)}
                aria-expanded={visibilityOpen}
                aria-haspopup="true"
              >
                Columns
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>

              {visibilityOpen && (
                <div
                  role="group"
                  aria-label="Toggle column visibility"
                  className={cn("absolute right-0 z-20 mt-1 min-w-[180px] p-2 space-y-1", GLASS_SURFACE)}
                >
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <label
                        key={column.id}
                        className="flex items-center gap-2 px-1 py-1 text-sm capitalize cursor-pointer"
                      >
                        <Checkbox
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                          aria-label={`Toggle ${column.id} column`}
                        />
                        {column.id.replace(/_/g, " ")}
                      </label>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table frame */}
      <div className={cn("overflow-hidden", GLASS_SURFACE)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (header.column.getCanSort() && header.column.columnDef.header) {
                    const label = header.column.columnDef.header;
                    return (
                      <SortableHeader
                        key={header.id}
                        column={header.column}
                      >
                        {typeof label === "string" ? label : null}
                      </SortableHeader>
                    );
                  }
                  return (
                    <TableHead key={header.id} aria-sort="none">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={resolvedColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: selection count + pagination */}
      {(enablePagination || enableRowSelection) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <div>
            {enableRowSelection
              ? `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} row(s) selected`
              : null}
          </div>

          {enablePagination && (
            <div className="flex items-center gap-2">
              <span>
                Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Go to previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Go to next page"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
