import { useMemo, useRef } from 'react'

import Loader from '../Loader'
import TableWrapper from './container'
import { HeaderCell, DataRow } from './cells'
import ContextMenu from '../ContextMenu'

const Table = ({
  data,
  columns,
  className,
  style,
  keyField,
  onRowClick,
  onKeyDown,
  selection,
  rowHighlightColor,
  sortBy,
  sortDirection,
  onSort,
  onLoadMore,
  contextMenu,
  loading = false,
}) => {
  const tableRef = useRef(null)
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

  const handleKeyDown = (event) => {
    if (onKeyDown) {
      onKeyDown(event)
    }
  }

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
    if (
      container.scrollHeight - container.scrollTop ===
      container.clientHeight
    ) {
      onLoadMore()
    }
  }

  return (
    <TableWrapper
      className={className}
      style={style}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
    >
      {loading && (
        <div className="contained center">
          <Loader />
        </div>
      )}
      <table onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
        {head}
        {body}
      </table>
      {contextMenu && <ContextMenu target={tableRef} options={contextMenu} />}
    </TableWrapper>
  )
}

export default Table
