import { Table, Section } from '@components';
import type { ContextMenuOption } from '@components/ContextMenu';
import type { TableColumn, TableRowData } from '@components/table/types';
import { useDialog } from '@features/Dialogs';
import { useNebula } from '@features/Nebula';
import {
  getColumnWidth,
  getFormatter,
  formatRowHighlightColor,
  formatRowHighlightStyle,
} from '@lib/tableFormat';
import { getErrorDetail } from '@lib/utils';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import { debounce } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { PAGE_SIZE, DEFAULT_SORT, tabColumns, tabRequest } from './query';
import type { BrowserView, TabSettings } from './types';
import { useBrowser } from './useBrowser';

import type { QueryRequest } from '@/client';
import { useWebSocket, type WebSocketHandler } from '@/features/Websocket';
import nebula from '@/nebula';

// Changed assets are collected for this long before the tabs ask for them
const UPDATE_DELAY = 300;

type Row = TableRowData & { id: number; ctime?: number };

const fetchRows = async (request: QueryRequest) => {
  const response = await nebula.assetsQueryPost({ body: request, throwOnError: true });
  return response.data;
};

interface BrowserTabProps {
  tab: TabSettings;
  view: BrowserView;
  active: boolean;
  isDragging: boolean;
}

const BrowserTab = ({ tab, view, active, isDragging }: BrowserTabProps) => {
  const { focusedAsset, setFocusedAsset } = useNebula();
  const browser = useBrowser();
  const ws = useWebSocket();
  const showDialog = useDialog();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  // Changes when another first page is loaded: the table starts over
  // (scroll position, column widths)
  const [loadedKey, setLoadedKey] = useState('');
  // Focus moved with the keyboard: the table scrolls to it
  const [keyboardFocus, setKeyboardFocus] = useState<number | null>(null);

  const selection = browser.tabSelection(tab.id);
  const reloadId = browser.reloads[tab.id] ?? 0;
  const request = useMemo(() => tabRequest(view, tab), [view, tab]);
  const requestKey = JSON.stringify(request);

  // Read by the handlers below, which outlive a render
  const rowsRef = useRef(rows);
  const requestRef = useRef(request);
  const cursorRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const loadedRef = useRef<{ key: string; tab: TabSettings } | null>(null);
  const browserRef = useRef(browser);
  useEffect(() => {
    rowsRef.current = rows;
    requestRef.current = request;
    browserRef.current = browser;
  });

  //
  // Loading
  //

  useEffect(() => {
    const key = `${requestKey}#${reloadId}`;
    // Back to what's loaded (a refused sort was undone)
    if (loadedRef.current?.key === key) return;
    const seq = ++seqRef.current;
    setLoading(true);
    fetchRows(request)
      .then((page) => {
        if (seq !== seqRef.current) return;
        loadedRef.current = { key, tab };
        cursorRef.current = page.has_more ? (page.next_cursor ?? null) : null;
        setRows(page.items as Row[]);
        setLoadedKey(key);
      })
      .catch((error: unknown) => {
        if (seq !== seqRef.current) return;
        toast.error(getErrorDetail(error));
        // The listing refused it (e.g. a sort without an index): back to
        // the loaded rows, or to the default sort. The refused sort can't
        // be chosen again this session
        if (!(error instanceof AxiosError) || error.response?.status !== 422) return;
        const unsortable = /^Can't sort by '(.+)'$/.exec(getErrorDetail(error))?.[1];
        if (unsortable) browser.markUnsortable(unsortable);
        const loaded = loadedRef.current?.tab;
        if (!loaded && !unsortable) return; // nothing to go back to
        const back = loaded ?? { ...tab, sort: DEFAULT_SORT };
        browser.updateTab(tab.id, {
          view: back.view,
          conditions: back.conditions,
          query: back.query,
          sort: back.sort,
        });
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, reloadId]);

  const loadMore = () => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    cursorRef.current = null;
    const seq = seqRef.current;
    void fetchRows({ ...requestRef.current, cursor })
      .then((page) => {
        if (seq !== seqRef.current) return;
        cursorRef.current = page.has_more ? (page.next_cursor ?? null) : null;
        const loaded = new Set(rowsRef.current.map((row) => row.id));
        // Rows added at the top since may come again
        const items = (page.items as Row[]).filter((row) => !loaded.has(row.id));
        setRows((prev) => [...prev, ...items]);
      })
      .catch((error: unknown) => {
        if (seq === seqRef.current) cursorRef.current = cursor;
        toast.error(getErrorDetail(error));
      });
  };

  //
  // Live updates: changed assets are asked for within the tab's filter.
  // Loaded rows are updated in place or removed, new ones go to the top
  // of a newest-first tab, or are counted ("N new")
  //

  useEffect(() => {
    const changed = new Set<number>();

    const update = debounce(async () => {
      const ids = [...changed];
      changed.clear();
      const request = requestRef.current;
      const seq = seqRef.current;
      const found = new Map<number, Row>();
      try {
        for (let i = 0; i < ids.length; i += PAGE_SIZE) {
          const chunk = ids.slice(i, i + PAGE_SIZE);
          const idFilter = { key: 'id', op: 'in' as const, value: chunk };
          const page = await fetchRows({
            ...request,
            filter: request.filter ? { and: [request.filter, idFilter] } : idFilter,
            limit: chunk.length,
          });
          for (const row of page.items as Row[]) found.set(row.id, row);
        }
      } catch (error) {
        console.error(error);
        return;
      }
      if (seq !== seqRef.current) return; // the tab reloaded meanwhile

      const current = rowsRef.current;
      const loaded = new Set(current.map((row) => row.id));
      const removed = new Set(ids.filter((id) => loaded.has(id) && !found.has(id)));
      let next = current
        .filter((row) => !removed.has(row.id))
        .map((row) => found.get(row.id) ?? row);

      const fresh = [...found.values()].filter((row) => !loaded.has(row.id));
      // Newest first: a row newer than the first one goes to the top
      const newest = next[0]?.ctime ?? 0;
      const onTop =
        requestRef.current.sort?.[0] === DEFAULT_SORT
          ? fresh.filter((row) => (row.ctime ?? 0) >= newest)
          : [];
      onTop.sort((a, b) => (b.ctime ?? 0) - (a.ctime ?? 0));
      if (onTop.length) next = [...onTop, ...next];
      const browser = browserRef.current;
      if (fresh.length > onTop.length) {
        browser.addNewCount(tab.id, fresh.length - onTop.length);
      }

      rowsRef.current = next;
      setRows(next);
      if (removed.size) {
        const selection = browser.tabSelection(tab.id);
        browser.setTabSelection(
          tab.id,
          selection.filter((id) => !removed.has(id))
        );
      }
    }, UPDATE_DELAY);

    const handlePubSub: WebSocketHandler<'objects_changed'> = (_topic, message) => {
      if (message.object_type !== 'asset') return;
      for (const id of message.objects) changed.add(id);
      void update();
    };

    const unsubscribe = ws.subscribe('objects_changed', handlePubSub);
    return () => {
      unsubscribe();
      update.cancel();
    };
  }, [ws, tab.id]);

  //
  // Columns
  //

  const columns = useMemo(
    (): TableColumn[] =>
      tabColumns(view, tab)
        .filter((name) => name !== 'subtitle') // shown with the title
        .map((name) => ({
          name,
          title: nebula.metaType(name).header,
          formatter: getFormatter(name),
          width: getColumnWidth(name),
          sortable: !browser.unsortable.includes(name),
        })),
    [view, tab, browser.unsortable]
  );

  const sortBy = tab.sort.replace(/^-/, '');
  const sortDirection = tab.sort.startsWith('-') ? 'desc' : 'asc';

  //
  // Selection and focus
  //

  const onRowClick = (rowData: TableRowData, event: React.MouseEvent) => {
    const rowId = rowData.id as number;
    let newSelection: number[];
    if (event.ctrlKey) {
      newSelection = selection.includes(rowId)
        ? selection.filter((id) => id !== rowId)
        : [...selection, rowId];
    } else if (event.shiftKey) {
      const selected = new Set(selection);
      const clickedIndex = rows.findIndex((row) => row.id === rowId);
      const focusedIndex = rows.findIndex((row) => row.id === focusedAsset);
      const anchor =
        focusedIndex !== -1
          ? focusedIndex
          : Math.max(
              rows.findIndex((row) => selected.has(row.id)),
              clickedIndex
            );
      const min = Math.min(clickedIndex, anchor);
      const max = Math.max(clickedIndex, anchor);
      for (const row of rows.slice(min, max + 1)) selected.add(row.id);
      newSelection = [...selected];
    } else {
      newSelection = [rowId];
    }
    browser.setTabSelection(tab.id, newSelection);
    setFocusedAsset(rowId);
  };

  const focusNext = (offset: number) => {
    const next = rows[rows.findIndex((row) => row.id === focusedAsset) + offset] as
      Row | undefined;
    if (!next) return;
    browser.setTabSelection(tab.id, [next.id]);
    setFocusedAsset(next.id);
    setKeyboardFocus(next.id);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      focusNext(1);
      event.preventDefault();
    }
    if (event.key === 'ArrowUp') {
      focusNext(-1);
      event.preventDefault();
    }
  };

  //
  // Context menu
  //

  const contextCellRef = useRef<{ rowData: TableRowData; columnName: string } | null>(
    null
  );

  const saveSelectionStatus = (status: number) => {
    const operations = selection.map((id) => ({ id, data: { status } }));
    nebula
      .ops({ body: { operations }, throwOnError: true })
      .then(() => {
        toast.success('Status updated');
      })
      .catch((error: unknown) => {
        console.error(error);
        toast.error(getErrorDetail(error));
      });
  };

  const setSelectionStatus = (status: number, question: string) => {
    showDialog('confirm', 'Are you sure?', { message: question })
      .then(() => {
        saveSelectionStatus(status);
      })
      .catch(() => {
        // dialog dismissed, do nothing
      });
  };

  const contextMenu = (): ContextMenuOption[] => {
    const options: ContextMenuOption[] = [];

    const cell = contextCellRef.current;
    const cellValue = cell?.rowData[cell.columnName];
    if (
      cell &&
      cellValue !== null &&
      cellValue !== undefined &&
      cellValue !== '' &&
      typeof cellValue !== 'object'
    ) {
      const key = cell.columnName;
      options.push({
        label: `Filter by ${nebula.metaType(key).header}`,
        icon: 'filter_alt',
        separator: true,
        onClick: () => {
          browser.updateTab(tab.id, {
            conditions: [
              ...tab.conditions.filter((condition) => condition.key !== key),
              { key, op: 'eq', value: cellValue },
            ],
          });
        },
      });
    }

    options.push(
      {
        label: 'Send to...',
        separator: options.length > 0,
        icon: 'send',
        onClick: () => {
          showDialog('sendto', 'Send to...', { assets: selection }).catch(() => {
            // dialog dismissed, do nothing
          });
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

  return (
    <Section className="grow" style={active ? undefined : { display: 'none' }}>
      <Table
        key={loadedKey}
        virtual
        data={rows}
        columns={columns}
        className={clsx('contained', isDragging && 'no-scroll')}
        keyField="id"
        selection={selection}
        focusedKey={keyboardFocus}
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
        onSort={(name, direction) => {
          browser.updateTab(tab.id, { sort: direction === 'desc' ? `-${name}` : name });
        }}
        onLoadMore={loadMore}
        contextMenu={contextMenu}
        columnWidths={browser.columnWidths(view.key)}
        onColumnResize={(name, width) => {
          browser.setColumnWidth(view.key, name, width);
        }}
      />
    </Section>
  );
};

export default BrowserTab;
