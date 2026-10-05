import type { TableDraggableItem, TableDraggableSubclip, TableRowData } from './types';

// Rows hold whatever the server sent. The table itself relies on a few
// well-known fields; these read them with their expected types.

export const rowId = (row: TableRowData) => row.id as string | number;

export const rowType = (row: TableRowData) =>
  (row.type as string | undefined) || 'asset';

export const toDraggableItem = (row: TableRowData): TableDraggableItem => ({
  id: rowId(row),
  type: rowType(row),
  title: row.title as string | undefined,
  subtitle: row.subtitle as string | undefined,
  duration: row.duration as number | undefined,
  mark_in: row.mark_in as number | undefined,
  mark_out: row.mark_out as number | undefined,
  subclips: row.subclips as TableDraggableSubclip[] | undefined,
});
