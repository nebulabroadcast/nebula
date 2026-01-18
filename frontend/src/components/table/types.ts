export type SortDirection = 'asc' | 'desc';
export type RowData = Record<string, any>;
export type CellFormatter = (rowData: RowData, columnName: string) => React.ReactNode;

export interface TableColumn {
  name: string;
  width?: string | number;
  title?: React.ReactNode;
  formatter?: CellFormatter;
}
