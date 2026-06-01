import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ClinicalTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface ClinicalDataTableProps<T> {
  columns: ClinicalTableColumn<T>[];
  rows: T[];
  emptyLabel?: string;
  rowKey: (row: T, index: number) => string;
}

export function ClinicalDataTable<T>({
  columns,
  rows,
  emptyLabel = "Aucune donnée.",
  rowKey,
}: ClinicalDataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={rowKey(row, index)}>
            {columns.map((column) => (
              <TableCell key={column.key}>{column.render(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
