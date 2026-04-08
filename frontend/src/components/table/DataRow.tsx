import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import React, { useMemo } from 'react';

import BodyCell from './BodyCell';
import { TableRowData, TableColumn, TableDraggableItem } from './types';

interface DataRowProps {
  rowData: TableRowData;
  columns: TableColumn[];
  onRowClick?: (
    rowData: TableRowData,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => void;
  rowHighlightColor?: (rowData: TableRowData) => string | undefined;
  rowHighlightStyle?: (
    rowData: TableRowData
  ) => 'none' | 'solid' | 'dotted' | 'dashed' | undefined;
  rowClass?: (rowData: TableRowData) => string;
  ident: string | number;
  index: number;
  selected?: boolean;
  draggableItems?: TableDraggableItem[];
}

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
}: DataRowProps) => {
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

  const handleClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if (event.type === 'contextmenu' || event.button === 2) {
      // if we're right-clicking, and the row is already selected,
      // don't change the selection - just show the context menu
      if (selected) return;
    }
    if (onRowClick) onRowClick(rowData, event);
  };

  const rowStyle: React.CSSProperties & Record<string, any> = {};
  let rowClassName = '';

  //
  // Highlighting row using its left border
  //

  let highlightColor = undefined;
  let highlightStyle = undefined;

  if (rowHighlightColor) highlightColor = rowHighlightColor(rowData);
  if (rowHighlightStyle) highlightStyle = rowHighlightStyle(rowData);
  if (rowClass) rowClassName = rowClass(rowData);

  if (highlightColor) rowStyle.borderLeftColor = highlightColor;
  if (highlightStyle) rowStyle.borderLeftStyle = highlightStyle;

  //
  // Row-Embedded progress bar
  //

  if (rowData.progress && rowData.progress > 0 && rowData.progress < 100) {
    rowStyle['--progress'] = rowData.progress + '%';
    rowStyle['--progress-opacity'] = 0.2;
  }

  //
  // Render the row
  //

  const rowContent = useMemo(() => {
    return (
      <>
        {columns.map((column) => (
          <BodyCell key={column.name} column={column} rowData={rowData} />
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
