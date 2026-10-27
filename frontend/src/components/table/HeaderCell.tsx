import React, { useMemo, useRef } from 'react';

import type { TableSortDirection, TableColumn } from './types';

const MIN_WIDTH = 40;

const SortIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="icon material-symbols-outlined" translate="no">
    {children}
  </span>
);

interface HeaderCellProps {
  column: TableColumn;
  // Only when the table doesn't set the widths with a <colgroup>
  width?: string | number;
  sortDirection?: TableSortDirection;
  onSort?: (name: string, direction: TableSortDirection) => void;
  // With these, the right edge is a resize handle: onResize while dragging,
  // onResizeEnd when released, null on double click (automatic width)
  onResize?: (width: number) => void;
  onResizeEnd?: (width: number | null) => void;
}

const HeaderCell = ({
  column,
  width,
  sortDirection,
  onSort,
  onResize,
  onResizeEnd,
}: HeaderCellProps) => {
  const sortable = onSort && column.sortable !== false;
  const dragRef = useRef<{ x: number; width: number; current: number } | null>(null);

  const sortArrowElement = useMemo(() => {
    if (!sortable) return;
    if (sortDirection === 'asc') return <SortIcon>arrow_drop_up</SortIcon>;
    if (sortDirection === 'desc') return <SortIcon>arrow_drop_down</SortIcon>;
    return <SortIcon>more_vert</SortIcon>;
  }, [sortDirection, sortable]);

  const onClick = () => {
    if (!sortable) return;
    onSort(column.name, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const onPointerDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    const th = event.currentTarget.closest('th');
    if (!th) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const width = th.getBoundingClientRect().width;
    dragRef.current = { x: event.clientX, width, current: width };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.current = Math.max(MIN_WIDTH, Math.round(drag.width + event.clientX - drag.x));
    onResize?.(drag.current);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && drag.current !== drag.width) onResizeEnd?.(drag.current);
  };

  return (
    <th
      style={{ width }}
      onClick={onClick}
      className={sortable ? 'sortable' : undefined}
    >
      <div>
        {column.title || ''}
        {sortArrowElement}
      </div>
      {onResizeEnd && (
        <span
          className="resize-handle"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onResizeEnd(null);
          }}
        />
      )}
    </th>
  );
};

export default HeaderCell;
