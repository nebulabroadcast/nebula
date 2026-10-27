import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { TableRowData } from './types';

// One line rows: 24px cells and a 1px border (Table.css). Fixed, because
// Firefox measures table rows wrongly
const ROW_HEIGHT = 25;

interface VirtualRowsProps {
  data: TableRowData[];
  columnCount: number;
  scrollElement: HTMLDivElement | null;
  focusedKey?: string | number | null;
  focusedIndex: number;
  renderRow: (rowData: TableRowData, index: number) => React.ReactNode;
}

// The body of a virtual table: the rows in view, between two spacer rows
// as high as the rows that aren't rendered. The virtualizer stays in this
// component (the React compiler skips components using it).
const VirtualRows = ({
  data,
  columnCount,
  scrollElement,
  focusedKey,
  focusedIndex,
  renderRow,
}: VirtualRowsProps) => {
  // The rows start below the sticky header. Measured after every render:
  // the header has no height while the table is hidden (display: none),
  // and the virtualizer renders again when it's shown
  const [headerHeight, setHeaderHeight] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const height = scrollElement?.querySelector('thead')?.offsetHeight;
    if (height && height !== headerHeight) setHeaderHeight(height);
  });

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
    scrollMargin: headerHeight,
    scrollPaddingStart: headerHeight,
  });

  // Scroll to the focused row when the focus changes, not when rows are
  // added or removed around it
  const focusedIndexRef = useRef(focusedIndex);
  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  });
  useEffect(() => {
    if (focusedIndexRef.current >= 0)
      virtualizer.scrollToIndex(focusedIndexRef.current);
  }, [focusedKey, virtualizer]);

  const items = virtualizer.getVirtualItems();
  const first = items.at(0);
  const last = items.at(-1);
  // Without rows in view (hidden table), the spacer keeps the height, so
  // the scroll position can be restored
  const top = first ? first.start - headerHeight : 0;
  const bottom = virtualizer.getTotalSize() - (last ? last.end - headerHeight : 0);

  const spacer = (height: number) =>
    height > 0 && (
      <tr className="spacer" style={{ height }}>
        <td colSpan={columnCount} />
      </tr>
    );

  return (
    <tbody>
      {spacer(top)}
      {items.map((item) => renderRow(data[item.index], item.index))}
      {spacer(bottom)}
    </tbody>
  );
};

export default VirtualRows;
