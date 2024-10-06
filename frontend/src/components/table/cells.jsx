import { useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'

const HeaderCell = ({ name, width, title, sortDirection, onSort }) => {
  let sortArrowElement = null
  if (onSort) {
    if (sortDirection === 'asc') {
      sortArrowElement = (
        <span className="icon material-symbols-outlined">arrow_drop_up</span>
      )
    } else if (sortDirection === 'desc') {
      sortArrowElement = (
        <span className="icon material-symbols-outlined">arrow_drop_down</span>
      )
    } else {
      sortArrowElement = (
        <span className="icon material-symbols-outlined">more_vert</span>
      )
    }
  }

  const onClick = () => {
    if (!onSort) return
    if (sortDirection === 'asc') {
      onSort(name, 'desc')
    } else {
      onSort(name, 'asc')
    }
  }
  return (
    <th style={{ width: width }} onClick={onClick}>
      <div>
        {title}
        {sortArrowElement}
      </div>
    </th>
  )
}

const BodyCell = ({ rowData, column, cellFormatter }) => {
  if (cellFormatter) return cellFormatter(rowData, column.name)
  return <td>{rowData[column.name]}</td>
}

const DataRow = ({
  rowData,
  columns,
  onRowClick,
  rowHighlightColor,
  rowHighlightStyle,
  selected = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: rowData.id,
      data: {
        type: 'asset',
        duration: rowData.duration,
        title: rowData.title,
        subtitle: rowData.subtitle,
      },
    })

  const handleClick = (event) => {
    if (event.type === 'contextmenu' || event.button === 2) {
      // if we're right-clicking, and the row is already selected,
      // don't change the selection - just show the context menu
      if (selected) return
    }

    if (onRowClick) onRowClick(rowData, event)
  }

  const rowStyle = {
    opacity: isDragging ? 0.5 : 1,
  }

  // Left-border highlight color
  let highlightColor = null
  let highlightStyle = null
  if (rowHighlightColor) highlightColor = rowHighlightColor(rowData)
  if (rowHighlightStyle) highlightStyle = rowHighlightStyle(rowData)
  if (highlightColor) rowStyle['borderLeftColor'] = highlightColor
  if (highlightStyle) rowStyle['borderLeftStyle'] = highlightStyle

  // Embedded progress bar
  if (rowData.progress && 100 > rowData.progress > 0) {
    rowStyle['--progress'] = rowData.progress + '%'
    rowStyle['--progress-opacity'] = 0.2
  }

  //
  // Reder the row
  //

  const rowContent = useMemo(() => {
    return (
      <>
        {columns.map((column) => (
          <BodyCell
            key={column.name}
            column={column}
            rowData={rowData}
            cellFormatter={column.formatter}
          />
        ))}
      </>
    )
  }, [columns, rowData])

  return (
    <tr
      ref={setNodeRef}
      onClick={handleClick}
      onContextMenu={handleClick}
      {...attributes}
      {...listeners}
      className={selected ? 'selected' : ''}
      style={rowStyle}
    >
      {rowContent}
    </tr>
  )
}

export { DataRow, HeaderCell }
