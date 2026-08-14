import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";

export interface Column<T> {
  /** Column header text/node. */
  header: ReactNode;
  /** Cell renderer for a row. */
  cell: (row: T) => ReactNode;
  className?: string;
  headClassName?: string;
}

/**
 * Generic, compact data table shared by every master-data list. Presentational
 * only (safe as a server component); interactivity lives inside the cells the
 * caller provides (e.g. a row-actions dropdown).
 */
export function MasterDataTable<T>({
  columns,
  rows,
  getRowKey,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Rendered in place of the table when there are no rows. */
  empty: ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col, i) => (
              <TableHead key={i} className={col.headClassName}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((col, i) => (
                <TableCell key={i} className={cn(col.className)}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
