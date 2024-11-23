const BodyCell = ({ rowData, column, cellFormatter }) => {
  if (cellFormatter) return cellFormatter(rowData, column.name)
  return <td>{rowData[column.name]}</td>
}
export default BodyCell
