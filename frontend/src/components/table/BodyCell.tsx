import type { TableRowData, TableColumn } from './types';

interface BodyCellProps {
  rowData: TableRowData;
  column: TableColumn;
}

const BodyCell = ({ rowData, column }: BodyCellProps) => {
  if (column.formatter) {
    return column.formatter(rowData, column.name);
  }
  // plain values only, anything else needs a formatter
  const value = rowData[column.name];
  return (
    <td>{typeof value === 'string' || typeof value === 'number' ? value : null}</td>
  );
};

export default BodyCell;
