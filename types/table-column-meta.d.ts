import { ColumnMeta } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends unknown, TValue> {
    className?: string;
    getRowClassName?: (row: TData) => string;
  }
}
