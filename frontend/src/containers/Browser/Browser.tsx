import React from 'react';
import { Table, Section } from '@components';
import Pagination from '@containers/Pagination';
import { useDialog } from '@features/Dialogs';
import { useNebula } from '@features/Nebula';
import {
  getColumnWidth,
  getFormatter,
  formatRowHighlightColor,
  formatRowHighlightStyle,
} from '@lib/tableFormat';
import { useLocalStorage } from '@lib/useLocalStorage';
import clsx from 'clsx';
import { debounce } from 'lodash';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';

import nebula from '@/nebula';

import BrowserNav from './BrowserNav';

import { useWebSocket } from '@/features/Websocket';
import type {
  TableRowData,
  TableColumn,
  TableSortDirection,
} from '@components/table/types';
import type { ContextMenuOption } from '@components/ContextMenu';

const ROWS_PER_PAGE = 200;

interface BrowserTableProps {
  isDragging?: boolean;
}

const BrowserTable: React.FC<BrowserTableProps> = ({ isDragging }) => {
  const {
    currentViewId,
    searchQuery,
    selectedAssets,
    focusedAsset,
    browserRefreshId,
    setCurrentView,
    setSelectedAssets,
    setFocusedAsset,
  } = useNebula();

  const currentView = useMemo(
    () => nebula.settings?.views?.find((v) => v.id === currentViewId),
    [currentViewId]
  );

  const ws = useWebSocket();

  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [data, setData] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useLocalStorage<string>('mam.browser.sortBy', 'ctime');
  const [sortDirection, setSortDirection] = useLocalStorage<TableSortDirection>(
    'mam.browser.sortDirection',
    'desc'
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const showDialog = useDialog();

  const dataRef = useRef<TableRowData[]>(data);
  const requestParamsRef = useRef<any>(null);

  //
  // References
  //

  useEffect(() => {
    // Save the data to a ref - it is used by the pubsub event handler
    // to match the changed objects with the current data
    dataRef.current = data;
  }, [data]);

  //
  // Data loading
  //

  const loadData = useCallback(() => {
    // Use current value of requestParamsRef to avoid stale data
    const params = requestParamsRef.current;
    if (!params) return;

    nebula
      .request('browse', params)
      .then((response) => {
        const hasMore = response.data.data.length > ROWS_PER_PAGE;
        const rows = response.data.data.slice(0, ROWS_PER_PAGE);
        setData(rows);
        setSortBy((current) =>
          response.data.order_by !== current ? response.data.order_by : current
        );
        setSortDirection((current) =>
          response.data.order_dir !== current ? response.data.order_dir : current
        );

        const cols: TableColumn[] = [];
        for (const colName of response.data.columns) {
          if (colName === 'subtitle') continue; // added automatically
          const meta = nebula.metaType(colName);
          const title =
            meta.header !== undefined && meta.header !== null ? meta.header : colName;

          cols.push({
            name: colName,
            title,
            formatter: getFormatter(colName),
            width: getColumnWidth(colName),
          });
        }
        setColumns(cols);
        setHasMore(hasMore);
      })
      .finally(() => setLoading(false));
  }, [setSortBy, setSortDirection]);

  useEffect(() => {
    // User changed view or search query
    if (!currentViewId) {
      // No view selected, load the first available view
      if (nebula.settings?.views?.length) {
        setCurrentView(nebula.settings.views[0].id);
      }
      return;
    }

    // Save the request params - we will use them to load the data
    // when objects are changed externally

    requestParamsRef.current = {
      view: currentViewId,
      query: searchQuery || '',
      limit: ROWS_PER_PAGE + 1,
      offset: page ? (page - 1) * ROWS_PER_PAGE : 0,
      order_by: sortBy,
      order_dir: sortDirection,
    };

    // show loading indicator only if the user initiated the refresh
    setLoading(true);
    loadData();
  }, [
    currentView,
    searchQuery,
    sortBy,
    sortDirection,
    page,
    browserRefreshId,
    currentViewId,
    setCurrentView,
    loadData,
  ]);

  useEffect(() => {
    // Reset page when view or search query changes
    setPage(1);
  }, [currentView, searchQuery, sortBy, sortDirection]);

  // Debounce the loadData function to avoid multiple requests
  // when multiple objects are changed at the same time
  const debouncingLoadData = useMemo(() => debounce(loadData, 100), [loadData]);

  //
  // Subscribe to objects_changed pubsub event
  //

  useEffect(() => {
    const handlePubSub = (topic: string, message: any) => {
      if (topic !== 'objects_changed') return;
      if (message.object_type !== 'asset') return;
      let changed = false;
      for (const obj of message.objects) {
        if (dataRef.current.find((row) => row.id === obj)) {
          changed = true;
          break;
        }
      }
      if (changed) {
        debouncingLoadData();
      }
    };

    const unsubscribe = ws.subscribe('objects_changed', handlePubSub);
    return () => {
      unsubscribe();
    };
  }, [ws, debouncingLoadData]);

  //
  // User interaction
  //

  const onRowClick = (rowData: TableRowData, event: React.MouseEvent) => {
    let newSelectedAssets: number[] = [];
    if (event.ctrlKey) {
      if (selectedAssets.includes(rowData.id as number)) {
        newSelectedAssets = selectedAssets.filter((obj) => obj !== rowData.id);
      } else {
        newSelectedAssets = [...selectedAssets, rowData.id as number];
      }
    } else if (event.shiftKey) {
      const clickedIndex = data.findIndex((row) => row.id === rowData.id);
      const focusedIndexFound = data.findIndex((row) => row.id === focusedAsset);
      const focusedIndex =
        focusedIndexFound !== -1
          ? focusedIndexFound
          : data.findIndex((row) => selectedAssets.includes(row.id as number));

      const actualFocusedIndex =
        focusedIndex !== -1 ? focusedIndex : clickedIndex !== -1 ? clickedIndex : 0;

      const min = Math.min(clickedIndex, actualFocusedIndex);
      const max = Math.max(clickedIndex, actualFocusedIndex);

      // Get the ids of the rows in the range
      const rangeIds = data.slice(min, max + 1).map((row) => row.id as number);

      newSelectedAssets = [...new Set([...selectedAssets, ...rangeIds])];
    } else {
      newSelectedAssets = [rowData.id as number];
    }

    setSelectedAssets(newSelectedAssets);
    setFocusedAsset(rowData.id as number);
  };

  const focusNext = (offset: number) => {
    if (!focusedAsset) return;
    const currentIndex = data.findIndex((row) => row.id === focusedAsset);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + offset;
    if (nextIndex >= 0 && nextIndex < data.length) {
      const nextRow = data[nextIndex];
      setSelectedAssets([nextRow.id as number]);
      setFocusedAsset(nextRow.id as number);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      focusNext(1);
      e.preventDefault();
    }
    if (e.key === 'ArrowUp') {
      focusNext(-1);
      e.preventDefault();
    }
  };

  const saveSelectionStatus = (status: number) => {
    const operations = selectedAssets.map((id) => ({
      id,
      data: { status },
    }));
    nebula
      .request('ops', { operations })
      .then(() => {
        toast.success('Status updated');
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.response?.data?.detail || 'Unknown error');
      });
  };

  const setSelectionStatus = (status: number, question?: string) => {
    // Change asset status of the selected assets
    if (question) {
      showDialog('confirm', 'Are you sure?', { message: question })
        .then(() => saveSelectionStatus(status))
        .catch(() => {});
    } else {
      saveSelectionStatus(status);
    }
  };

  const sendTo = () => {
    showDialog('sendto', 'Send to...', { assets: selectedAssets })
      .then(() => {})
      .catch(() => {});
  };

  const contextMenu = (): ContextMenuOption[] => [
    {
      label: 'Send to...',
      icon: 'send',
      onClick: () => sendTo(),
    },
    {
      label: 'Reset',
      icon: 'undo',
      onClick: () =>
        setSelectionStatus(5, 'Do you want to reload selected assets metadata?'),
    },
    {
      label: 'Archive',
      separator: true,
      icon: 'archive',
      onClick: () =>
        setSelectionStatus(4, 'Do you want to move selected assets to archive?'),
    },
    {
      label: 'Trash',
      icon: 'delete',
      hlColor: 'var(--color-red)',
      onClick: () =>
        setSelectionStatus(3, 'Do you want to move selected assets to trash?'),
    },
  ];

  const tableClass = clsx('contained', isDragging && 'no-scroll');

  return (
    <>
      <Section className="grow">
        <Table
          data={data}
          columns={columns}
          className={tableClass}
          keyField="id"
          selection={selectedAssets}
          onRowClick={onRowClick}
          onKeyDown={onKeyDown}
          rowHighlightColor={formatRowHighlightColor}
          rowHighlightStyle={formatRowHighlightStyle}
          loading={loading}
          sortBy={sortBy}
          sortDirection={sortDirection}
          contextMenu={contextMenu}
          onSort={(sortBy, sortDirection) => {
            setSortBy(sortBy);
            setSortDirection(sortDirection);
          }}
        />
      </Section>
      <Pagination page={page} setPage={setPage} hasMore={hasMore} />
    </>
  );
};

interface BrowserProps {
  isDragging?: boolean;
}

const Browser: React.FC<BrowserProps> = ({ isDragging }) => {
  return (
    <>
      <BrowserNav />
      <BrowserTable isDragging={isDragging} />
    </>
  );
};

export default Browser;
