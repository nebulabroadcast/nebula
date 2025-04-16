import { useMemo } from 'react';

const SortIcon = ({ children }) => (
  <span className="icon material-symbols-outlined">{children}</span>
);

const HeaderCell = ({ name, width, title, sortDirection, onSort }) => {
  const sortArrowElement = useMemo(() => {
    if (!onSort) return;
    if (sortDirection === 'asc') return <SortIcon>arrow_drop_up</SortIcon>;
    if (sortDirection === 'desc') return <SortIcon>arrow_drop_down</SortIcon>;
    return <SortIcon>more_vert</SortIcon>;
  }, [sortDirection, onSort]);

  const onClick = () => {
    if (!onSort) return;
    if (sortDirection === 'asc') {
      onSort(name, 'desc');
    } else {
      onSort(name, 'asc');
    }
  };
  return (
    <th style={{ width: width }} onClick={onClick}>
      <div>
        {title}
        {sortArrowElement}
      </div>
    </th>
  );
};

export default HeaderCell;
