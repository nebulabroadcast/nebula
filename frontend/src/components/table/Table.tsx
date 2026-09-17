import clsx from 'clsx';
import React, { useMemo, useRef, useEffect } from 'react';

import { ContextMenu, type ContextMenuOption } from '../ContextMenu';
import { Loader, LoaderWrapper } from '../Loader';

import DataRow from './DataRow';
import HeaderCell from './HeaderCell';
import type {
  TableRowData,
  TableColumn,
  TableSortDirection,
  TableDroppable,
  TableDraggableItem,
} from './types';

import './Table.css';

interface TableProps {
  data: TableRowData[];
  columns: TableColumn[];
  className?: string;
  style?: React.CSSProperties;
  keyField?: string;
  onRowClick?: (
    rowData: TableRowData,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => void;
  onContextMenu?: (rowData: TableRowData, columnName: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTableElement>) => void;
  selection?: Array<string | number>;
  rowHighlightColor?: (rowData: TableRowData) => string | undefined;
  rowHighlightStyle?: (
    rowData: TableRowData
  ) => 'none' | 'solid' | 'dotted' | 'dashed' | undefined;
  rowClass?: (rowData: TableRowData) => string;
  sortBy?: string;
  sortDirection?: TableSortDirection;
  onSort?: (name: string, direction: TableSortDirection) => void;
  onLoadMore?: () => void;
  contextMenu?: () => ContextMenuOption[];
  droppable?: TableDroppable;
  onDrop?: (droppable: TableDroppable, dropIndex: number | null) => void;
  loading?: boolean;
}

const Table = ({
  data,
  columns,
  className,
  style,
  keyField,
  onRowClick,
  onContextMenu,
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
}: TableProps) => {
  const tableRef = useRef<HTMLElement>(null);
  const droppableRef = useRef<TableDroppable | undefined>(undefined);
  const dropIndexRef = useRef<number | null>(null);

  const head = useMemo(() => {
    return (
      <thead>
        <tr>
          {columns.map((column) => (
            <HeaderCell
              key={column.name}
              column={column}
              sortDirection={sortBy === column.name ? sortDirection : undefined}
              onSort={onSort}
            />
          ))}
        </tr>
      </thead>
    );
  }, [columns, sortBy, sortDirection, onSort]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableElement>) => {
    if (onKeyDown) {
      onKeyDown(event);
    }
  };

  useEffect(() => {
    droppableRef.current = droppable;
  }, [droppable]);

  const body = useMemo(() => {
    const draggableItems: TableDraggableItem[] = [];
    if (selection && selection.length > 0) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (selection.includes(keyField ? row[keyField] : i)) {
          draggableItems.push({
            id: row.id,
            type: row.type || 'asset',
            title: row.title,
            subtitle: row.subtitle,
            duration: row.duration,
            mark_in: row.mark_in,
            mark_out: row.mark_out,
            subclips: row.subclips,
          });
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
            onContextMenu={onContextMenu}
            rowHighlightColor={rowHighlightColor}
            rowHighlightStyle={rowHighlightStyle}
            rowClass={rowClass}
            selected={selection?.includes(keyField ? rowData[keyField] : idx)}
            key={keyField ? rowData[keyField] : idx}
            ident={keyField ? rowData[keyField] : idx}
            index={idx}
            draggableItems={draggableItems}
          />
        ))}
      </tbody>
    );
  }, [
    columns,
    data,
    selection,
    keyField,
    rowHighlightColor,
    onRowClick,
    onContextMenu,
    rowClass,
    rowHighlightStyle,
  ]);

  const handleScroll = (event: React.UIEvent<HTMLElement>) => {
    if (!onLoadMore) return;
    const container = event.target;
    if (!(container instanceof HTMLElement)) return;
    if (container.scrollHeight - container.scrollTop === container.clientHeight) {
      onLoadMore();
    }
  };

  const onMouseMove = (event: MouseEvent) => {
    const target = event.target;
    if (!target) return;
    if (!(target instanceof HTMLElement)) return;
    // find the closest row
    const row = target.closest('tr');

    let index = null;
    if (droppableRef.current && row instanceof HTMLElement) {
      index = row ? parseInt(row.getAttribute('data-index') || '', 10) : null;
    }

    // iterate over all rows and find the one that matches the mouse position
    // clean up highlight for all rows except the one we're hovering over

    const rows = tableRef.current?.querySelectorAll('tbody tr');
    if (rows) {
      rows.forEach((r) => {
        const rIndex = parseInt(r.getAttribute('data-key') || '', 10);
        if (rIndex === index) {
          r.classList.add('drop-highlight');
        } else {
          r.classList.remove('drop-highlight');
        }
      });
    }

    if (!droppableRef.current) {
      return;
    }

    if (index === null) {
      return;
    }
    dropIndexRef.current = index;
  };

  const onMouseUp = (event: MouseEvent) => {
    // are we dragging?
    if (!droppableRef.current) return;
    if (!tableRef.current) return;
    const target = event.target;
    if (!target) return;
    if (!(target instanceof HTMLElement)) return;
    // ensure mouse up event is triggered on the child element of the table

    if (!tableRef.current.contains(target)) return;
    if (onDrop) {
      onDrop(droppableRef.current, dropIndexRef.current);
    }
    droppableRef.current = undefined;
  };

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      if (!tableRef.current) return;
      tableRef.current.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [tableRef.current]);

  return (
    <div
      className={clsx('nb-table', className)}
      style={style}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
    >
      {loading && (
        <LoaderWrapper>
          <Loader />
        </LoaderWrapper>
      )}
      <table
        onKeyDown={handleKeyDown}
        tabIndex={0}
        ref={tableRef as React.RefObject<HTMLTableElement>}
      >
        {head}
        {body}
      </table>
      {contextMenu && tableRef && (
        <ContextMenu
          target={tableRef as React.RefObject<HTMLElement>}
          options={contextMenu}
        />
      )}
    </div>
  );
};

export default Table;
