import { Table } from '@components';
import type { TableDraggableItem, TableRowData } from '@components/table/types';
import { useDialog } from '@features/Dialogs';
import { useNebula } from '@features/Nebula';
import { formatRowHighlightColor, formatRowHighlightStyle } from '@lib/tableFormat';
import React, { useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router';

import type { ObjectType, RundownRow } from '../../client';

import RundownTableWrapper from './RundownTableWrapper';
import { getRunModeOptions, getRundownColumns } from './utils';

import nebula from '@/nebula';

interface RundownTableProps {
  data: RundownRow[];
  draggedObjects: TableDraggableItem[] | null;
  onDrop: (items: any[], index: number) => void;
  currentItem?: number | string | null;
  cuedItem?: number | string | null;
  loading: boolean;
  selectedItems: Array<number | string>;
  setSelectedItems: (items: Array<number | string>) => void;
  selectedEvents: Array<number | string>;
  setSelectedEvents: (events: Array<number | string>) => void;
  focusedObject: RundownRow | null;
  setFocusedObject: (object: RundownRow | null) => void;
  rundownMode: string;
  loadRundown: () => void;
  onError: (error: any) => void;
}

const RundownTable: React.FC<RundownTableProps> = ({
  data,
  draggedObjects,
  onDrop,
  currentItem,
  cuedItem,
  loading,
  selectedItems,
  setSelectedItems,
  selectedEvents,
  setSelectedEvents,
  focusedObject,
  setFocusedObject,
  rundownMode,
  loadRundown,
  onError,
}) => {
  const [, setSearchParams] = useSearchParams();
  const location = useLocation();
  const lastHash = useRef('');
  const lastRqTs = useRef<number | string>(0);
  const { currentChannelId } = useNebula();
  const tableRef = useRef<HTMLDivElement>(null);
  const showDialog = useDialog();

  const channelConfig = useMemo(() => {
    return currentChannelId ? nebula.getPlayoutChannel(currentChannelId) : undefined;
  }, [currentChannelId]);

  //
  // Scroll to the event definded in the hash when the component mounts
  //

  useEffect(() => {
    if (!location.hash) return;
    if (!data?.length) return;
    if (!tableRef.current) return;

    const queryParams = new URLSearchParams(location.search);
    const rqts = queryParams.get('rqts') || 0;

    // already scrolled to this hash
    if (lastHash.current === location.hash.slice(1) && lastRqTs.current === rqts)
      return;

    // find the index of the event to scroll to
    let scrollToIndex: number | null = null;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.type === 'event' && row.id.toString() === location.hash.slice(1)) {
        scrollToIndex = i;
        break;
      }
    }

    if (scrollToIndex === null) return;

    // get the row element and scroll to it
    const query = `[data-index="${scrollToIndex}"]`;
    const row = tableRef.current.querySelector(query);
    if (row) {
      const pos =
        (row as HTMLElement).offsetTop - (row.parentNode as HTMLElement).offsetTop;
      const parent = row.parentNode?.parentNode?.parentNode as HTMLElement; // he he he
      if (parent) {
        parent.scrollTop = pos;
      }
      lastHash.current = location.hash.slice(1);
      lastRqTs.current = rqts;
    }
  }, [location, data]);

  //
  // Define table columns and additional styling
  //

  const columns = useMemo(() => getRundownColumns(), []);

  const getRundownRowClass = (rowData: TableRowData) => {
    const row = rowData as RundownRow;
    if (row.type === 'event') return 'event-row';
    if (row.id === currentItem) return 'current-item';
    if (row.id === cuedItem) return 'cued-item';
    return '';
  };

  //
  // Operations on selected items
  //

  const deleteSelectedItems = () => {
    if (!selectedItems.length) return;
    console.debug('Deleting items:', selectedItems);
    const payload = {
      object_type: 'item' as ObjectType,
      ids: selectedItems.map(Number),
    };
    nebula
      .delete_({ body: payload, throwOnError: true })
      .then(loadRundown)
      .catch(onError);
  };

  const onSendTo = () => {
    const ids = data
      .filter((row) => row.id_asset && selectedItems.includes(row.id))
      .map((row) => row.id_asset!);
    if (!ids.length) return;

    showDialog('sendto', 'Send to...', { assets: ids })
      .then(() => {
        // nothing to do after sending
      })
      .catch(() => {
        // dialog dismissed, do nothing
      });
  };

  const onSetPrimary = async () => {
    if (!focusedObject?.id_asset) return;
    const id_asset = focusedObject.id_asset;
    const id_event = focusedObject.id_event;
    try {
      const res = await nebula.get({
        body: { object_type: 'asset', ids: [id_asset] },
        throwOnError: true,
      });
      console.log('Asset:', res.data.data);
      if (!res.data?.data?.length) {
        console.error('Asset not found:', id_asset);
        return;
      }
      const meta = res.data.data[0];
      const emeta: Record<string, any> = {};
      for (const field of channelConfig?.fields || []) {
        const key = field.name;
        emeta[key] = meta[key] || null;
      }
      emeta.id_asset = id_asset;
      await nebula.set({
        body: { object_type: 'event', id: id_event, data: emeta },
        throwOnError: true,
      });

      loadRundown();
    } catch (err) {
      onError(err);
      return;
    }
  };

  const onSolve = (solver: string) => {
    const items = data
      .filter(
        (row) => row.item_role === 'placeholder' && selectedItems.includes(row.id)
      )
      .map((row) => row.id);
    nebula
      .solve({ body: { solver, items }, throwOnError: true })
      .then(loadRundown)
      .catch(onError);
  };

  const updateObject = (object_type: ObjectType, id: number | string, data: any) => {
    const operations = [{ object_type, id: Number(id), data }];
    nebula
      .ops({ body: { operations }, throwOnError: true })
      .then(loadRundown)
      .catch(onError);
  };

  const setRunMode = (
    object_type: 'event' | 'item',
    id: number | string,
    run_mode: number
  ) => {
    updateObject(object_type, id, { run_mode });
  };

  const editObject = async (object_type: ObjectType, id: number | string) => {
    let objectData: any = {};
    try {
      const res = await nebula.get({
        body: { object_type, ids: [Number(id)] },
        throwOnError: true,
      });
      objectData = res.data.data?.[0];
    } catch (err) {
      onError(err);
      return;
    }

    // Create a field list based on the object type

    let fields: any[];
    if (object_type === 'event') {
      fields = [...(channelConfig?.fields || [])];
    } else if (['placeholder', 'live'].includes(objectData.item_role)) {
      fields = [{ name: 'title' }, { name: 'duration' }];
    } else if (['lead_in', 'lead_out'].includes(objectData.item_role)) {
      return;
    } else if (objectData.id_asset) {
      fields = [
        { name: 'title' },
        { name: 'subtitle' },
        { name: 'note' },
        { name: 'mark_in' },
        { name: 'mark_out' },
      ];
    } else {
      return;
    }

    // if the object is item with asset, we need to get the asset data

    if (object_type === 'item' && objectData.id_asset) {
      try {
        const res = await nebula.get({
          body: { object_type: 'asset', ids: [objectData.id_asset] },
          throwOnError: true,
        });
        const assetData = res.data.data?.[0] || {};
        for (const field of fields) {
          const key = field.name;
          if (!objectData[key]) objectData[key] = assetData[key];
        }
      } catch (err) {
        onError(err);
        return;
      }
    }

    // construct the form title and initial data

    const title = `Edit ${object_type}: ${objectData.title}`;
    const initialData: Record<string, any> = {};
    for (const field of fields) {
      initialData[field.name] = objectData[field.name];
    }

    try {
      const newData = await showDialog('metadata', title, {
        fields,
        initialData,
      });
      updateObject(object_type, id, newData);
    } catch {
      // dialog was cancelled
    }
  };

  //
  // User interaction && Selection handling
  //

  const onRowClick = (
    rowData: TableRowData,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => {
    const row = rowData as RundownRow;
    if (row.type === 'event') {
      setSelectedItems([]);
      setSelectedEvents([row.id]);
      return;
    }

    if (row.id_asset) {
      const id_asset = row.id_asset;
      setSearchParams((o) => {
        o.set('asset', id_asset.toString());
        return o;
      });
    }

    setSelectedEvents([]);
    if (event.detail === 2) {
      // doubleClick
      if (
        rundownMode === 'control' &&
        row.type === 'item' &&
        currentChannelId !== null
      ) {
        nebula
          .playout({
            body: {
              id_channel: currentChannelId,
              action: 'cue',
              payload: { id_item: row.id },
            },
            throwOnError: true,
          })
          .then(loadRundown)
          .catch(onError);
        return;
      }
    }

    let newSelectedItems: Array<number | string> = [];
    if (event.ctrlKey) {
      if (selectedItems.includes(row.id)) {
        newSelectedItems = selectedItems.filter((obj) => obj !== row.id);
      } else {
        newSelectedItems = [...selectedItems, row.id];
      }
    } else if (event.shiftKey) {
      const clickedIndex = data.findIndex((r) => r.id === row.id);
      const focusedIndex =
        (focusedObject && data.findIndex((r) => r.id === focusedObject.id)) ||
        data.findIndex((r) => selectedItems.includes(r.id)) ||
        clickedIndex ||
        0;

      const min = Math.min(clickedIndex, focusedIndex);
      const max = Math.max(clickedIndex, focusedIndex);

      // Get the ids of the rows in the range
      const rangeIds = data
        .slice(min, max + 1)
        .filter((r) => r.type === 'item')
        .map((r) => r.id);

      newSelectedItems = [...new Set([...selectedItems, ...rangeIds])];
    } else {
      newSelectedItems = [row.id];
    }

    setSelectedItems(newSelectedItems);
    setFocusedObject(row);
  }; // onRowClick

  const focusNext = (offset: number) => {
    if (!focusedObject) return;
    const focusedIndex = data.findIndex(
      (row) => row.type === focusedObject.type && row.id === focusedObject.id
    );
    if (focusedIndex === -1) return;
    const nextIndex = focusedIndex + offset;
    if (nextIndex >= 0 && nextIndex < data.length) {
      const nextRow = data[nextIndex];
      if (nextRow.type === 'item') {
        setSelectedItems([nextRow.id]);
      } else {
        setSelectedEvents([nextRow.id]);
        setSelectedItems([]);
      }
      setFocusedObject(nextRow);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      focusNext(1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      focusNext(-1);
      e.preventDefault();
    } else if (e.key === 'Delete') {
      deleteSelectedItems();
      e.preventDefault();
    }
  };

  const contextMenu = () => {
    const res: any[] = [];
    if (selectedItems.length) {
      if (selectedItems.length === 1 && focusedObject) {
        res.push({
          label: 'Edit item',
          icon: 'edit',
          onClick: () => editObject('item', selectedItems[0]),
        });
        if (focusedObject.id_asset) {
          res.push({
            label: 'Set as primary',
            icon: 'star',
            onClick: onSetPrimary,
          });
        }

        res.push({
          label: 'Send to...',
          icon: 'send',
          onClick: onSendTo,
        });
      }

      if (focusedObject?.item_role === 'placeholder') {
        for (const solver of channelConfig?.solvers || []) {
          res.push({
            label: `Solve using ${solver}`,
            icon: 'change_circle',
            onClick: () => {
              onSolve(solver);
            },
          });
        }
      }

      res.push(...getRunModeOptions('item', selectedItems[0], setRunMode));

      res.push({
        label: 'Delete',
        icon: 'delete',
        hlColor: 'var(--color-red)',
        onClick: deleteSelectedItems,
        separator: true,
      });
      return res;
    } else if (selectedEvents.length === 1) {
      res.push({
        label: 'Edit event',
        icon: 'edit',
        onClick: () => editObject('event', selectedEvents[0]),
      });
      res.push(...getRunModeOptions('event', selectedEvents[0], setRunMode));
    }
    return res;
  };

  //
  // Render
  //

  const selectionIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < data?.length || 0; i++) {
      if (selectedItems.includes(data[i].id) && data[i].type === 'item') {
        indices.push(i);
      }
      if (selectedEvents.includes(data[i].id) && data[i].type === 'event') {
        indices.push(i);
      }
    }
    return indices;
  }, [selectedItems, selectedEvents, data]);

  return (
    <RundownTableWrapper className="grow nopad" ref={tableRef}>
      <Table
        columns={columns}
        data={data}
        className="contained"
        loading={loading}
        onRowClick={onRowClick}
        rowClass={getRundownRowClass}
        rowHighlightColor={formatRowHighlightColor}
        rowHighlightStyle={formatRowHighlightStyle}
        contextMenu={contextMenu}
        selection={selectionIndices}
        onKeyDown={onKeyDown}
        droppable={
          draggedObjects ? { type: 'mixed', items: draggedObjects } : undefined
        }
        onDrop={(droppable, dropIndex) => {
          onDrop(droppable.items, dropIndex ?? 0);
        }}
      />
    </RundownTableWrapper>
  );
};

export default RundownTable;
