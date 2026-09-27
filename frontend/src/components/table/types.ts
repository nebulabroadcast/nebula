import type { ItemRole } from '@/client';

export type TableSortDirection = 'asc' | 'desc';
export type TableRowData = Record<string, any>;
export type TableCellFormatter = (
  rowData: TableRowData,
  columnName: string
) => React.ReactNode;

export interface TableColumn {
  name: string;
  width?: string | number;
  title?: React.ReactNode;
  formatter?: TableCellFormatter;
}

export interface TableDroppable {
  type: string;
  items: TableDraggableItem[];
}

export interface TableDropTarget {
  id: string | number;
  type: string;
}

export interface TableDraggableSubclip {
  title?: string;
  name?: string;
  mark_in?: number | null;
  mark_out?: number | null;
}

// Dragged from a table row, or from the rundown edit tools. Items from the
// edit tools are new, so they have an item_role but no id yet.
export interface TableDraggableItem {
  id?: string | number;
  type: string;
  item_role?: ItemRole;
  title?: string;
  subtitle?: string;
  duration?: number;
  mark_in?: number;
  mark_out?: number;
  subclips?: TableDraggableSubclip[];
}
