import { TableRowData } from '@components/table/types';

export type TableCellFormatter = (
  rowData: TableRowData,
  columnName: string
) => React.ReactNode;
