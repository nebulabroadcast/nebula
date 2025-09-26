import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { useMemo } from 'react';

import BodyCell from './BodyCell';

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
  draggableItems,
}) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: rowData.id,
    data:
      draggableItems?.length &&
      draggableItems.filter(
        (item) => item.id === rowData.id && (item.type === rowData.type || 'asset')
      ).length
        ? draggableItems
        : [
            {
              id: rowData.id,
              type: rowData.type || 'asset',
              title: rowData.title,
              subtitle: rowData.subtitle,
              duration: rowData.duration,
              mark_in: rowData.mark_in,
              mark_out: rowData.mark_out,
            },
          ],
  });

  const handleClick = (event) => {
    if (event.type === 'contextmenu' || event.button === 2) {
      // if we're right-clicking, and the row is already selected,
      // don't change the selection - just show the context menu
      if (selected) return;
    }
    if (onRowClick) onRowClick(rowData, event);
  };

  const rowStyle = {};
  let rowClassName = '';

  // Left-border highlight color
  let highlightColor = null;
  let highlightStyle = null;
  if (rowHighlightColor) highlightColor = rowHighlightColor(rowData);
  if (rowHighlightStyle) highlightStyle = rowHighlightStyle(rowData);
  if (rowClass) rowClassName = rowClass(rowData);
  if (highlightColor) rowStyle['borderLeftColor'] = highlightColor;
  if (highlightStyle) rowStyle['borderLeftStyle'] = highlightStyle;

  // Embedded progress bar
  if (rowData.progress && 100 > rowData.progress > 0) {
    rowStyle['--progress'] = rowData.progress + '%';
    rowStyle['--progress-opacity'] = 0.2;
  }

  //
  // Reder the row
  //


  // Handler to forward cell context menu events up to parent (Table)
  const handleCellContextMenu = (cellInfo) => {
    // Attach contextData to the native event and trigger contextmenu
    if (cellInfo && cellInfo.event) {
      cellInfo.event.contextData = { column: cellInfo.column, value: cellInfo.value, rowData, rowIndex: index };
    }
  };

  const rowContent = useMemo(() => {
    return (
      <>
        {columns.map((column) => (
          <BodyCell
            key={column.name}
            column={column}
            rowData={rowData}
            cellFormatter={column.formatter}
            onCellContextMenu={handleCellContextMenu}
          />
        ))}
      </>
    );
  }, [columns, rowData]);

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
  );
};

export default DataRow;
