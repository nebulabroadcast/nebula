import { useMemo } from 'react'

import Loader from '../Loader'
import TableWrapper from './container'
import { HeaderCell, DataRow } from './cells'

const Table = ({
  data,
  columns,
  className,
  style,
  keyField,
  onRowClick,
  selection,
  rowHighlightColor,
  sortBy,
  sortDirection,
  onSort,
  onLoadMore,
  loading = false,
}) => {
  const head = useMemo(() => {
    return (
      <thead>
        <tr>
          {columns.map((column) => (
            <HeaderCell
              key={column.name}
              sortDirection={sortBy === column.name ? sortDirection : null}
              onSort={onSort}
              {...column}
            />
          ))}
        </tr>
      </thead>
    )
  }, [columns, sortBy, sortDirection, onSort])

  const body = useMemo(() => {
    return (
      <tbody>
        {(data || []).map((rowData, idx) => (
          <DataRow
            rowData={rowData}
            columns={columns}
            onRowClick={onRowClick}
            rowHighlightColor={rowHighlightColor}
            selected={selection && selection.includes(rowData[keyField])}
            key={keyField ? rowData[keyField] : idx}
          />
        ))}
      </tbody>
    )
  }, [columns, data, selection, keyField, rowHighlightColor])

  
  const handleScroll = (event) => {
    if (!onLoadMore) return
    const container = event.target
    if ( container.scrollHeight - container.scrollTop === container.clientHeight) {
      onLoadMore()
    }
  }

  return (
    <TableWrapper className={className} style={style} onScroll={handleScroll}>
      {loading && (
        <div className="contained center">
          <Loader />
        </div>
      )}
      <table>
        {head}
        {body}
      </table>
    </TableWrapper>
  )
}

export default Table
