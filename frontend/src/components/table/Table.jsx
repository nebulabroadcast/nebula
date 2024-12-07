import { useState, useMemo, useRef, useEffect } from 'react'

import { Loader, LoaderWrapper } from '../Loader'
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
    if (!droppableRef.current) setDropHl(null)
  }, [droppable])

  const body = useMemo(() => {
    const draggableItems = []
    if (selection?.length > 0) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        if (selection.includes(keyField ? row[keyField] : i)) {
          draggableItems.push({
            id: row.id,
            type: row.type || 'asset',
            title: row.title,
            subtitle: row.subtitle,
            duration: row.duration,
            mark_in: row.mark_in,
            mark_out: row.mark_out,
          })
        }
      }
    }

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
            draggableItems={draggableItems}
          />
        ))}
      </tbody>
    )
  }, [columns, data, selection, keyField, rowHighlightColor, droppable])

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
    // are we dragging?
    if (!droppableRef.current) return
    // ensure mouse up event is triggered on the child element of the table
    if (!tableRef.current.contains(event.target)) return
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
      onMouseLeave={() => setDropHl(null)}
      $drophl={dropHl || null}
    >
      {loading && (
        <LoaderWrapper>
          <Loader />
        </LoaderWrapper>
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
