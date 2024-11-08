import { useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import clsx from 'clsx'

import BodyCell from './BodyCell'

const DataRow = ({
  rowData,
  columns,
  onRowClick,
  rowHighlightColor,
  rowHighlightStyle,
  rowClass,
  ident,
  index,
  selected = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: rowData.id,
      data: {
        id: rowData.id,
        type: rowData.type || 'asset',
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
    opacity: isDragging ? 0.3 : 1,
  }

  let rowClassName = ''

  // Left-border highlight color
  let highlightColor = null
  let highlightStyle = null
  if (rowHighlightColor) highlightColor = rowHighlightColor(rowData)
  if (rowHighlightStyle) highlightStyle = rowHighlightStyle(rowData)
  if (rowClass) rowClassName = rowClass(rowData)
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
      className={clsx(selected && 'selected', rowClassName)}
      style={rowStyle}
      data-key={ident}
      data-index={index}
      {...attributes}
      {...listeners}
    >
      {rowContent}
    </tr>
  )
}

export default DataRow
