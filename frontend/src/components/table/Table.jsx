import { useState, useMemo, useRef, useEffect } from 'react'

import Loader from '../Loader'
import ContextMenu from '../ContextMenu'

import TableWrapper from './TableWrapper'
import HeaderCell from './HeaderCell'
import DataRow from './DataRow'

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
  rowHighlightStyle,
  rowClass,
  sortBy,
  sortDirection,
  onSort,
  onLoadMore,
  contextMenu,
  droppable,
  onDrop,
  loading = false,
}) => {
  const tableRef = useRef(null)
  const droppableRef = useRef(null)
  const dropIndexRef = useRef(null)
  const [dropHl, setDropHl] = useState(null)

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

  useEffect(() => {
    droppableRef.current = droppable
  }, [droppable])

  const body = useMemo(() => {
    return (
      <tbody>
        {(data || []).map((rowData, idx) => (
          <DataRow
            rowData={rowData}
            columns={columns}
            onRowClick={onRowClick}
            rowHighlightColor={rowHighlightColor}
            rowHighlightStyle={rowHighlightStyle}
            rowClass={rowClass}
            selected={
              selection &&
              selection.includes(keyField ? rowData[keyField] : idx)
            }
            key={keyField ? rowData[keyField] : idx}
            ident={keyField ? rowData[keyField] : idx}
            index={idx}
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

  const onMouseMove = (event) => {
    if (!droppableRef.current) return
    const target = event.target
    if (!target) return
    // find the closest row
    const row = target.closest('tr')
    const index = row ? row.getAttribute('data-index') : null
    dropIndexRef.current = index
    setDropHl(index)
  }

  const onMouseUp = (event) => {
    if (!droppableRef.current) return
    if (onDrop) onDrop(droppableRef.current, dropIndexRef.current)
    droppableRef.current = null
    setDropHl(null)
  }

  useEffect(() => {
    if (!tableRef.current) return
    tableRef.current.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      if (!tableRef.current) return
      tableRef.current.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [tableRef.current])

  return (
    <TableWrapper
      className={className}
      style={style}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      dropHl={dropHl}
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
