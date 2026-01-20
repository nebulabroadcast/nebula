import React, { useMemo } from 'react';

import type { TableSortDirection, TableColumn } from './types';

const SortIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="icon material-symbols-outlined" translate="no">
    {children}
  </span>
);

interface HeaderCellProps {
  column: TableColumn;
  sortDirection?: TableSortDirection;
  onSort?: (name: string, direction: TableSortDirection) => void;
}

const HeaderCell = ({ column, sortDirection, onSort }: HeaderCellProps) => {
  const sortArrowElement = useMemo(() => {
    if (!onSort) return;
    if (sortDirection === 'asc') return <SortIcon>arrow_drop_up</SortIcon>;
    if (sortDirection === 'desc') return <SortIcon>arrow_drop_down</SortIcon>;
    return <SortIcon>more_vert</SortIcon>;
  }, [sortDirection, onSort]);

  const onClick = () => {
    if (!onSort) return;
    if (sortDirection === 'asc') {
      onSort(column.name, 'desc');
    } else {
      onSort(column.name, 'asc');
    }
  };
  return (
    <th style={{ width: column.width }} onClick={onClick}>
      <div>
        {column.title || ''}
        {sortArrowElement}
      </div>
    </th>
  );
};

export default HeaderCell;
