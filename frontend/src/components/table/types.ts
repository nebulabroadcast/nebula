export type TableSortDirection = 'asc' | 'desc';
export type TableRowData = Record<string, any>;
export type TableCellFormatter = (rowData: TableRowData, columnName: string) => React.ReactNode;

export interface TableColumn {
  name: string;
  width?: string | number;
  title?: React.ReactNode;
  formatter?: TableCellFormatter;
}


export interface TableDroppable {
  type: string;
  items: {
    id: string | number;
    type: string;
    title?: string;
    subtitle?: string;
    duration?: number;
    mark_in?: number;
    mark_out?: number;
  }[];
}

export interface TableDraggableItem {
  id: string | number;
  type: string;
  title?: string;
  subtitle?: string;
  duration?: number;
  mark_in?: number;
  mark_out?: number;
  subclips?: any[];
}
