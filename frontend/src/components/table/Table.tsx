import clsx from 'clsx';
import React, { useMemo, useRef, useEffect, useState } from 'react';

import { ContextMenu, type ContextMenuOption } from '../ContextMenu';
import { Loader, LoaderWrapper } from '../Loader';

import DataRow from './DataRow';
import HeaderCell from './HeaderCell';
import { rowId, rowType, toDraggableItem } from './rowFields';
import type {
  TableRowData,
  TableColumn,
  TableSortDirection,
  TableDroppable,
  TableDropTarget,
} from './types';
import VirtualRows from './VirtualRows';

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
  // Called when the scroll gets near the end, once per length of `data`
  onLoadMore?: () => void;
  contextMenu?: () => ContextMenuOption[];
  droppable?: TableDroppable;
  onDrop?: (
    droppable: TableDroppable,
    dropIndex: number | null,
    dropTarget: TableDropTarget | null
  ) => void;
  loading?: boolean;
  // Render only the rows in view. Rows have a fixed height (one line) and
  // the column widths are measured once, from the first rows
  virtual?: boolean;
  // Virtual tables: the row with this key is scrolled into view when it
  // changes
  focusedKey?: string | number | null;
  // Column widths in px, by column name. With onColumnResize, the headers
  // get a resize handle (except the last column); null is automatic width
  columnWidths?: Record<string, number>;
  onColumnResize?: (name: string, width: number | null) => void;
}

// selection holds keyField values, or row indexes when there's no keyField
const rowKey = (row: TableRowData, idx: number, keyField?: string): string | number =>
  keyField ? (row[keyField] as string | number) : idx;

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
  virtual = false,
  focusedKey,
  columnWidths,
  onColumnResize,
}: TableProps) => {
  // State, not a ref: virtual rows need it in their first layout effects,
  // which run before the refs of their parents are set
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLElement>(null);
  const droppableRef = useRef<TableDroppable | undefined>(undefined);
  const dropIndexRef = useRef<number | null>(null);
  const dropTargetRef = useRef<TableDropTarget | null>(null);
  const loadMoreAtRef = useRef<number | null>(null);

  const selectionSet = useMemo(() => new Set(selection), [selection]);

  // Keep the latest data in a ref: onMouseMove/onMouseUp below are
  // registered once (see the drag listeners effect) via native
  // listeners, so reading `data` directly would close over a stale
  // array whenever the table reloads mid-drag. Dragged items are built
  // from the refs too, when a drag starts.
  const dataRef = useRef<TableRowData[]>(data);
  const selectionRef = useRef(selectionSet);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    dataRef.current = data;
    selectionRef.current = selectionSet;
  }, [data, selectionSet]);
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);
  useEffect(() => {
    droppableRef.current = droppable;
  }, [droppable]);

  // The dragged row, or every selected row if the dragged one is selected
  const getDragItems = useMemo(
    () => (rowData: TableRowData, index: number) => {
      if (!selectionRef.current.has(rowKey(rowData, index, keyField))) {
        return [toDraggableItem(rowData)];
      }
      return dataRef.current
        .filter((row, idx) => selectionRef.current.has(rowKey(row, idx, keyField)))
        .map(toDraggableItem);
    },
    [keyField]
  );

  //
  // Column widths
  //

  // Measured once per set of columns, when the first rows are rendered:
  // with only some rows rendered, automatic widths would change while
  // scrolling. Then the table sets them (fixed layout).
  const columnsKey = columns.map((column) => column.name).join(',');
  const measureWidths = virtual || !!onColumnResize;
  const [measured, setMeasured] = useState<{
    key: string;
    widths: Record<string, number>;
  } | null>(null);
  const frozen = measured?.key === columnsKey ? measured.widths : null;
  // Width of a column while its resize handle is dragged
  const [resizing, setResizing] = useState<{ name: string; width: number } | null>(
    null
  );

  // Observed, so it also happens when the rows arrive or a hidden table
  // (display: none) is shown
  useEffect(() => {
    const table = tableRef.current;
    if (!measureWidths || frozen || !table) return;
    const names = columnsKey.split(',');
    const observer = new ResizeObserver(() => {
      if (!table.querySelector('tbody tr[data-index]')) return;
      const widths: Record<string, number> = {};
      table.querySelectorAll('thead th').forEach((cell, idx) => {
        const width = cell.getBoundingClientRect().width;
        if (width && names[idx]) widths[names[idx]] = Math.round(width);
      });
      if (Object.keys(widths).length !== names.length) return;
      setMeasured({ key: columnsKey, widths });
    });
    observer.observe(table);
    return () => {
      observer.disconnect();
    };
  }, [measureWidths, frozen, columnsKey]);

  // Columns without a width of their own (title, description...) fill the
  // remaining space; if there are none, the last column does
  const fillsSpace = (column: TableColumn, idx: number) =>
    column.width === undefined ||
    (idx === columns.length - 1 && columns.every((c) => c.width !== undefined));

  const widthOf = (column: TableColumn, idx: number): number | undefined => {
    if (resizing?.name === column.name) return resizing.width;
    if (columnWidths?.[column.name]) return columnWidths[column.name];
    if (fillsSpace(column, idx)) return undefined;
    return frozen?.[column.name];
  };

  const colgroup = frozen && (
    <colgroup>
      {columns.map((column, idx) => (
        <col key={column.name} style={{ width: widthOf(column, idx) }} />
      ))}
    </colgroup>
  );

  // The columns that fill the space keep at least their measured width
  const minTableWidth = frozen
    ? columns.reduce(
        (sum, column, idx) => sum + (widthOf(column, idx) ?? frozen[column.name] ?? 0),
        0
      )
    : undefined;

  //
  // Head
  //

  const head = (
    <thead>
      <tr>
        {columns.map((column, idx) => {
          const resizable = onColumnResize && idx < columns.length - 1;
          return (
            <HeaderCell
              key={column.name}
              column={column}
              width={frozen ? undefined : (columnWidths?.[column.name] ?? column.width)}
              sortDirection={sortBy === column.name ? sortDirection : undefined}
              onSort={onSort}
              onResize={
                resizable
                  ? (width) => {
                      setResizing({ name: column.name, width });
                    }
                  : undefined
              }
              onResizeEnd={
                resizable
                  ? (width) => {
                      setResizing(null);
                      // automatic width: measured again
                      if (width === null) setMeasured(null);
                      onColumnResize(column.name, width);
                    }
                  : undefined
              }
            />
          );
        })}
      </tr>
    </thead>
  );

  //
  // Body
  //

  const renderRow = (rowData: TableRowData, idx: number) => {
    const key = rowKey(rowData, idx, keyField);
    return (
      <DataRow
        rowData={rowData}
        columns={columns}
        onRowClick={onRowClick}
        onContextMenu={onContextMenu}
        rowHighlightColor={rowHighlightColor}
        rowHighlightStyle={rowHighlightStyle}
        rowClass={rowClass}
        selected={selectionSet.has(key)}
        key={key}
        ident={key}
        index={idx}
        getDragItems={getDragItems}
      />
    );
  };

  const focusedIndex =
    virtual && focusedKey != null
      ? data.findIndex((row, idx) => rowKey(row, idx, keyField) === focusedKey)
      : -1;

  const body = virtual ? (
    <VirtualRows
      data={data}
      columnCount={columns.length}
      scrollElement={scrollElement}
      focusedKey={focusedKey}
      focusedIndex={focusedIndex}
      renderRow={renderRow}
    />
  ) : (
    <tbody>{data.map(renderRow)}</tbody>
  );

  // Browsers forget the scroll position of a hidden (display: none)
  // element: it's put back when the table is shown again
  const scrollTopRef = useRef(0);
  useEffect(() => {
    if (!scrollElement) return;
    let hidden = !scrollElement.clientHeight;
    const observer = new ResizeObserver(() => {
      if (hidden && scrollElement.clientHeight) {
        scrollElement.scrollTop = scrollTopRef.current;
      }
      hidden = !scrollElement.clientHeight;
    });
    observer.observe(scrollElement);
    return () => {
      observer.disconnect();
    };
  }, [scrollElement]);

  const handleScroll = (event: React.UIEvent<HTMLElement>) => {
    const container = event.currentTarget;
    if (!container.clientHeight) return; // hidden
    scrollTopRef.current = container.scrollTop;
    if (!onLoadMore) return;
    const remaining =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    // Within a screen of the end: load the next page, once per data length
    if (remaining < container.clientHeight && loadMoreAtRef.current !== data.length) {
      loadMoreAtRef.current = data.length;
      onLoadMore();
    }
  };

  // The drag listeners are registered once, on mount: they only read refs,
  // so they always see the current drag state, data and onDrop handler.
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const onMouseMove = (event: MouseEvent) => {
      const target = event.target;
      if (!target) return;
      if (!(target instanceof HTMLElement)) return;
      // find the closest row (spacer rows of virtual tables have no index)
      const row = target.closest('tr');
      const rowIndex = parseInt(row?.getAttribute('data-index') || '', 10);
      const index = droppableRef.current && !isNaN(rowIndex) ? rowIndex : null;

      // highlight the row we're hovering over, clean up the others
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((r) => {
        r.classList.toggle('drop-highlight', r === row && index !== null);
      });

      if (index === null) return;
      dropIndexRef.current = index;
      const hoveredRow = dataRef.current[index];
      dropTargetRef.current = hoveredRow
        ? { id: rowId(hoveredRow), type: rowType(hoveredRow) }
        : null;
    };

    const onMouseUp = (event: MouseEvent) => {
      // are we dragging?
      if (!droppableRef.current) return;
      const target = event.target;
      if (!target) return;
      if (!(target instanceof HTMLElement)) return;
      // ensure mouse up event is triggered on the child element of the table

      if (!table.contains(target)) return;
      onDropRef.current?.(
        droppableRef.current,
        dropIndexRef.current,
        dropTargetRef.current
      );
      droppableRef.current = undefined;
      dropTargetRef.current = null;
    };

    table.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      table.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div
      className={clsx('nb-table', virtual && 'virtual', className)}
      style={style}
      onScroll={handleScroll}
      ref={setScrollElement}
    >
      {loading && (
        <LoaderWrapper>
          <Loader />
        </LoaderWrapper>
      )}
      <table
        onKeyDown={onKeyDown}
        tabIndex={0}
        ref={tableRef as React.RefObject<HTMLTableElement>}
        style={frozen ? { tableLayout: 'fixed', minWidth: minTableWidth } : undefined}
      >
        {colgroup}
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
