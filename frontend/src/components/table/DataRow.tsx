import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import React, { useMemo } from 'react';

import BodyCell from './BodyCell';
import { RowData, TableColumn } from './types';

interface DataRowProps {
  rowData: RowData;
  columns: TableColumn[];
  onRowClick?: (
    rowData: RowData,
    event: React.MouseEvent<HTMLTableRowElement, MouseEvent>
  ) => void;
  rowHighlightColor?: (rowData: RowData) => string | undefined;
  rowHighlightStyle?: (rowData: RowData) => 'none' | 'solid' | 'dotted' | undefined;
  rowClass?: (rowData: RowData) => string;
  ident: string | number;
  index: number;
  selected?: boolean;
  draggableItems?: {
    id: string | number;
    type: string;
    title?: string;
    subtitle?: string;
    duration?: number;
    mark_in?: number;
    mark_out?: number;
  }[];
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

  const rowStyle: React.CSSProperties & { [key: string]: any } = {};
  let rowClassName = '';

  //
  // Highlighting row using its left border
  //

  let highlightColor = undefined;
  let highlightStyle = undefined;

  if (rowHighlightColor) highlightColor = rowHighlightColor(rowData);
  if (rowHighlightStyle) highlightStyle = rowHighlightStyle(rowData);
  if (rowClass) rowClassName = rowClass(rowData);

  if (highlightColor) rowStyle['borderLeftColor'] = highlightColor;
  if (highlightStyle) rowStyle['borderLeftStyle'] = highlightStyle;

  // Embedded progress bar
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
