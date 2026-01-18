import type { TableRowData, TableColumn } from './types';

interface BodyCellProps {
  rowData: TableRowData;
  column: TableColumn;
}

const BodyCell = ({ rowData, column }: BodyCellProps) => {
  if (column.formatter) {
    return column.formatter(rowData, column.name);
  }
  return <td>{rowData[column.name]}</td>;
};

export default BodyCell;
