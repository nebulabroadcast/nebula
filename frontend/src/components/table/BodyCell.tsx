import type { TableRowData, TableColumn } from './types';

interface BodyCellProps {
  rowData: TableRowData;
  column: TableColumn;
}

const BodyCell = ({ rowData, column }: BodyCellProps) => {
  const value = rowData[column.name];
  return (
    <td className={column.className} style={column.style}>
      {column.formatter
        ? column.formatter(rowData, column.name)
        : // plain values only, anything else needs a formatter
          typeof value === 'string' || typeof value === 'number'
          ? value
          : null}
    </td>
  );
};

export default BodyCell;
