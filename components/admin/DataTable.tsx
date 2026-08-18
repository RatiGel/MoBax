'use client';

import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  pageSize?: number;
  // server-side pagination
  page?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  // server-side sort
  sort?: { key: string; dir: 'asc' | 'desc' };
  onSortChange?: (sort: { key: string; dir: 'asc' | 'desc' }) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  // optional row selection — covers only the rows currently rendered
  // (this page), never the whole server-side-paginated result set.
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getRowId?: (row: T) => string;
}

// Selection state is exactly what the amber signal is for. The check glyph is
// ink, not white — white on amber is 2.03:1 (see CLAUDE.md), so the indicator
// colour is set here alongside the fill rather than inherited.
const CHECKBOX_CLASS =
  'data-[state=checked]:bg-cobalt data-[state=checked]:border-cobalt data-[state=checked]:text-ink data-[state=indeterminate]:bg-cobalt data-[state=indeterminate]:border-cobalt data-[state=indeterminate]:text-ink';

// Exported for unit testing. Only ever called when `selectable` is on, so
// failing loudly here is safe: a row with no `id`/`_id` would otherwise
// stringify to "undefined" and collapse every such row onto one selection id.
export function defaultGetRowId<T>(row: T): string {
  const r = row as { id?: string; _id?: string };
  const id = r.id ?? r._id;
  if (id == null) {
    throw new Error('DataTable: selectable requires each row to have `id`/`_id`, or pass getRowId.');
  }
  return String(id);
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  pageSize = 20,
  page = 1,
  total = 0,
  onPageChange,
  sort,
  onSortChange,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId = defaultGetRowId,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedSet = new Set(selectedIds ?? []);
  // `getRowId` must never run when selection is off: nine existing tables pass
  // no selection props, and some of their row shapes have no `id`/`_id` — the
  // default resolver throws for those. Everything derived from row ids is
  // therefore gated on `selectable` too.
  const pageRowIds = selectable ? rows.map((row) => getRowId(row)) : [];
  const selectedOnPageCount = selectable
    ? pageRowIds.filter((id) => selectedSet.has(id)).length
    : 0;
  const allOnPageSelected =
    selectable && pageRowIds.length > 0 && selectedOnPageCount === pageRowIds.length;
  const someOnPageSelected = selectable && selectedOnPageCount > 0 && !allOnPageSelected;

  function toggleSort(key: string) {
    if (!onSortChange) return;
    const dir = sort?.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
    onSortChange({ key, dir });
  }

  function toggleSelectAll() {
    if (!onSelectionChange) return;
    if (allOnPageSelected) {
      onSelectionChange((selectedIds ?? []).filter((id) => !pageRowIds.includes(id)));
    } else {
      const next = new Set(selectedIds ?? []);
      pageRowIds.forEach((id) => next.add(id));
      onSelectionChange(Array.from(next));
    }
  }

  function toggleRow(id: string) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds ?? []);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(Array.from(next));
  }

  return (
    <div className="rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
      {/* Horizontal scroll keeps wide tables usable on small screens. */}
      <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-neutral-50/80 dark:bg-neutral-900/40">
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-10 whitespace-nowrap">
                <Checkbox
                  className={CHECKBOX_CLASS}
                  checked={someOnPageSelected ? 'indeterminate' : allOnPageSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all rows on this page"
                  disabled={pageRowIds.length === 0}
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={`whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ${col.className ?? ''}`}
              >
                {col.sortable && onSortChange ? (
                  <button
                    className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.header}
                    {sort?.key === col.key ? (
                      sort.dir === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                {selectable && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-5 w-full max-w-[160px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={selectable ? columns.length + 1 : columns.length} className="p-0">
                <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => {
              // Gated: see the `pageRowIds` note above — resolving an id for a
              // non-selectable table would throw on rows without `id`/`_id`.
              const id = selectable ? pageRowIds[rowIndex] : undefined;
              return (
                <TableRow
                  key={rowKey(row)}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
                >
                  {selectable && id !== undefined && (
                    // Stop clicks bubbling: `TableRow` carries a
                    // `data-[state=selected]` style, so a row-level onClick may
                    // land here later and must not fire on a checkbox tick.
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        className={CHECKBOX_CLASS}
                        checked={selectedSet.has(id)}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label={`Select row ${id}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`whitespace-nowrap ${col.className ?? ''}`}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {onPageChange && total > 0 && (
        <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark px-4 py-3 text-sm">
          <span className="text-neutral-500">
            {total} item{total === 1 ? '' : 's'} · page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
