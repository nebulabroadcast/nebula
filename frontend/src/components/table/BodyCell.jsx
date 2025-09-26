
const BodyCell = ({ rowData, column, cellFormatter, onCellContextMenu }) => {
  const handleContextMenu = (e) => {
    if (onCellContextMenu) {
      e.preventDefault();
      onCellContextMenu({
        column: column.name,
        value: rowData[column.name],
        rowData,
        event: e,
      });
    }
  };
  if (cellFormatter) return cellFormatter(rowData, column.name);
  return <td onContextMenu={handleContextMenu}>{rowData[column.name]}</td>;
};
export default BodyCell;
