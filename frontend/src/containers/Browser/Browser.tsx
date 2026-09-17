import { Table, Section } from '@components';
import type {
  TableColumn,
  TableRowData,
  TableSortDirection,
} from '@components/table/types';
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
import { useEffect, useState, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';

import BrowserNav from './BrowserNav';

import type { BrowseAssetsRequest } from '@/client';
import type { ContextMenuOption } from '@/components/ContextMenu';
import { useWebSocket } from '@/features/Websocket';
import nebula from '@/nebula';

const ROWS_PER_PAGE = 200;

type RequestParams = Required<
  Pick<
    BrowseAssetsRequest,
    'view' | 'query' | 'conditions' | 'limit' | 'offset' | 'order_by' | 'order_dir'
  >
>;

interface BrowserTableProps {
  isDragging: boolean;
}

const BrowserTable = ({ isDragging }: BrowserTableProps) => {
  const {
    currentViewId,
    searchQuery,
    filterConditions,
    selectedAssets,
    focusedAsset,
    browserRefreshId,
    setCurrentView,
    setFilterConditions,
    setSelectedAssets,
    setFocusedAsset,
  } = useNebula();

  const currentView = useMemo(
    () => (nebula?.settings?.views || []).find((v) => v.id === currentViewId),
    [currentViewId]
  );

  const ws = useWebSocket();

  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [data, setData] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useLocalStorage('mam.browser.sortBy', 'ctime');
  const [sortDirection, setSortDirection] = useLocalStorage<TableSortDirection>(
    'mam.browser.sortDirection',
    'desc'
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const showDialog = useDialog();

  const dataRef = useRef(data);
  const requestParamsRef = useRef<RequestParams | null>(null);
  const contextCellRef = useRef<{ rowData: TableRowData; columnName: string } | null>(
    null
  );

  //
  // References
  //

  useEffect(() => {
    // Save the data to a ref - it is used by the pubsub event handler
    // to match the changed objects with the current data
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    // User changed view or search query
    if (!currentViewId) {
      // No view selected, load the first available view
      if (nebula?.settings?.views?.length) {
        setCurrentView(nebula.settings.views[0].id);
      }
      return;
    }

    // Save the request params - we will use them to load the data
    // when objects are changed externally

    requestParamsRef.current = {
      view: currentViewId,
      query: searchQuery || '',
      conditions: filterConditions.length ? filterConditions : null,
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
    filterConditions,
    sortBy,
    sortDirection,
    page,
    browserRefreshId,
  ]);

  useEffect(() => {
    // Reset page when view, search query or filters change
    setPage(1);
  }, [currentView, searchQuery, filterConditions, sortBy, sortDirection]);

  //
  // Data loading
  //

  const loadData = () => {
    // Use current value of requestParamsRef to avoid stale data
    const params = requestParamsRef.current;
    if (!params) return;
    void nebula
      .browse({ body: params, throwOnError: true })
      .then((response) => {
        const hasMore = response.data.data.length > ROWS_PER_PAGE;
        const rows = response.data.data.slice(0, ROWS_PER_PAGE);
        setData(rows);
        if (response.data.order_by !== sortBy) setSortBy(response.data.order_by);
        if (response.data.order_dir !== sortDirection)
          setSortDirection(response.data.order_dir);

        const cols = [];
        for (const colName of response.data.columns) {
          if (colName == 'subtitle') continue; // added automatically
          cols.push({
            name: colName,
            title: nebula.metaType(colName).header,
            formatter: getFormatter(colName),
            width: getColumnWidth(colName),
          });
        }
        setColumns(cols);
        setHasMore(hasMore);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Debounce the loadData function to avoid multiple requests
  // when multiple objects are changed at the same time
  const debouncingLoadData = debounce(loadData, 100);

  //
  // Subscribe to objects_changed pubsub event
  //

  useEffect(() => {
    const handlePubSub = (topic: string, message: Record<string, any>) => {
      if (topic !== 'objects_changed') return;
      if (message.object_type !== 'asset') return;
      let changed = false;
      for (const obj of message.objects) {
        const _data = dataRef.current || [];
        if (_data.find((row: Record<string, any>) => row.id === obj)) {
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
  }, [ws]);

  //
  // User interaction
  //

  const onRowClick = (rowData: Record<string, any>, event: React.MouseEvent) => {
    let newSelectedAssets = [];
    if (event.ctrlKey) {
      if (selectedAssets.includes(rowData.id as number)) {
        newSelectedAssets = selectedAssets.filter((obj) => obj !== rowData.id);
      } else {
        newSelectedAssets = [...selectedAssets, rowData.id];
      }
    } else if (event.shiftKey) {
      const clickedIndex = data.findIndex(
        (row: Record<string, any>) => row.id === rowData.id
      );
      const focusedAssetIndex = data.findIndex(
        (row: Record<string, any>) => row.id === focusedAsset
      );
      const firstSelectedIndex = data.findIndex((row: Record<string, any>) =>
        selectedAssets.includes(row.id as number)
      );
      const focusedIndex =
        focusedAssetIndex !== -1
          ? focusedAssetIndex
          : firstSelectedIndex !== -1
            ? firstSelectedIndex
            : clickedIndex !== -1
              ? clickedIndex
              : 0;

      const min = Math.min(clickedIndex, focusedIndex);
      const max = Math.max(clickedIndex, focusedIndex);

      // Get the ids of the rows in the range
      const rangeIds = data
        .slice(min, max + 1)
        .map((row: Record<string, any>) => row.id as number);

      newSelectedAssets = [...new Set([...selectedAssets, ...rangeIds])];
    } else {
      newSelectedAssets = [rowData.id];
    }

    setSelectedAssets(newSelectedAssets);
    setFocusedAsset(rowData.id);
  };

  const focusNext = (offset: number) => {
    if (focusedAsset === null) return;
    const nextIndex =
      data.findIndex((row: Record<string, any>) => row.id === focusedAsset) + offset;
    if (nextIndex < data.length) {
      const nextRow: Record<string, any> = data[nextIndex];
      if (!nextRow) return;
      setSelectedAssets([nextRow.id]);
      setFocusedAsset(nextRow.id);
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
      .ops({ body: { operations }, throwOnError: true })
      .then(() => {
        toast.success('Status updated');
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.response?.detail);
      });
  };

  const setSelectionStatus = (status: number, question: string) => {
    // Change asset status of the selected assets
    if (question) {
      showDialog('confirm', 'Are you sure?', { message: question })
        .then(() => {
          saveSelectionStatus(status);
        })
        .catch(() => {
          // dialog dismissed, do nothing
        });
    } else {
      saveSelectionStatus(status);
    }
  };

  const sendTo = () => {
    showDialog('sendto', 'Send to...', { assets: selectedAssets })
      .then(() => {
        // nothing to do after sending
      })
      .catch(() => {
        // dialog dismissed, do nothing
      });
  };

  const contextMenu = (): ContextMenuOption[] => {
    const options: ContextMenuOption[] = [];

    const cell = contextCellRef.current;
    const cellValue = cell && cell.rowData[cell.columnName];
    if (
      cell &&
      cellValue !== null &&
      cellValue !== undefined &&
      cellValue !== '' &&
      typeof cellValue !== 'object'
    ) {
      const columnName = cell.columnName;
      options.push({
        label: `Filter by ${nebula.metaType(columnName).header}`,
        icon: 'filter_alt',
        separator: true,
        onClick: () => {
          setFilterConditions([
            ...filterConditions.filter((condition) => condition.key !== columnName),
            {
              key: columnName,
              value: cellValue as string | number | boolean,
              operator: '=',
            },
          ]);
        },
      });
    }

    options.push(
      {
        label: 'Send to...',
        separator: options.length > 0,
        icon: 'send',
        onClick: () => {
          sendTo();
        },
      },
      {
        label: 'Reset',
        icon: 'undo',
        onClick: () => {
          setSelectionStatus(5, 'Do you want to reload selected assets metadata?');
        },
      },
      {
        label: 'Archive',
        separator: true,
        icon: 'archive',
        onClick: () => {
          setSelectionStatus(4, 'Do you want to move selected assets to archive?');
        },
      },
      {
        label: 'Trash',
        icon: 'delete',
        hlColor: 'var(--color-red)',
        onClick: () => {
          setSelectionStatus(3, 'Do you want to move selected assets to trash?');
        },
      }
    );

    return options;
  };

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
          onContextMenu={(rowData, columnName) => {
            contextCellRef.current = { rowData, columnName };
          }}
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

const Browser = ({ isDragging }: BrowserTableProps) => {
  return (
    <>
      <BrowserNav />
      <BrowserTable isDragging={isDragging} />
    </>
  );
};

export default Browser;
