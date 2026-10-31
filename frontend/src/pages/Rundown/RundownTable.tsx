import { Button, Table } from '@components';
import type {
  TableDraggableItem,
  TableDropTarget,
  TableRowData,
} from '@components/table/types';
import { showEventDialog, useDialog } from '@features/Dialogs';
import { useNebula } from '@features/Nebula';
import { formatRowHighlightColor, formatRowHighlightStyle } from '@lib/tableFormat';
import React, { useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router';
import styled from 'styled-components';

import { RunMode } from '../../client';
import type { EventData, ObjectType, RundownRow } from '../../client';

import RundownTableWrapper from './RundownTableWrapper';
import { getRunModeOptions, getRundownColumns } from './utils';

import type { ContextMenuOption } from '@/components/ContextMenu';
import nebula from '@/nebula';

const EmptyRundown = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-dim);
  text-align: center;

  p {
    margin: 4px 0;
  }

  button {
    margin-top: 12px;
  }
`;

interface RundownTableProps {
  data: RundownRow[];
  startTime: Date | null;
  draggedObjects: TableDraggableItem[] | null;
  onDrop: (
    items: TableDraggableItem[],
    index: number,
    dropTarget: TableDropTarget | null
  ) => void;
  currentItem?: number | string | null;
  cuedItem?: number | string | null;
  loading: boolean;
  selectedItems: Array<number | string>;
  setSelectedItems: (items: Array<number | string>) => void;
  selectedEvents: Array<number | string>;
  setSelectedEvents: (events: Array<number | string>) => void;
  focusedObject: RundownRow | null;
  setFocusedObject: (object: RundownRow | null) => void;
  rundownModes: string[];
  loadRundown: () => void;
  onError: (error: unknown) => void;
}

const RundownTable: React.FC<RundownTableProps> = ({
  data,
  startTime,
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
  rundownModes,
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
  // Scroll to the event in the hash (scheduler double click), or to an item
  // of it in the `item` param (F1: the item on air, in the middle)
  //

  useEffect(() => {
    if (!location.hash) return;
    if (!data?.length) return;
    if (!tableRef.current) return;

    const queryParams = new URLSearchParams(location.search);
    const rqts = queryParams.get('rqts') || 0;

    // already scrolled to this hash
    const eventId = location.hash.slice(1);
    if (lastHash.current === eventId && lastRqTs.current === rqts) return;

    // an item of another event (a param left over) is ignored
    const itemId = queryParams.get('item');
    const itemIndex = data.findIndex(
      (row) =>
        row.type === 'item' &&
        row.id.toString() === itemId &&
        row.id_event?.toString() === eventId
    );
    const scrollToIndex =
      itemIndex !== -1
        ? itemIndex
        : data.findIndex(
            (row) => row.type === 'event' && row.id.toString() === eventId
          );
    if (scrollToIndex === -1) return;

    // get the row element and scroll to it
    const query = `[data-index="${scrollToIndex}"]`;
    const row = tableRef.current.querySelector<HTMLElement>(query);
    if (row) {
      const pos = row.offsetTop - (row.parentNode as HTMLElement).offsetTop;
      const parent = row.parentNode?.parentNode?.parentNode as HTMLElement; // he he he
      if (parent) {
        parent.scrollTop =
          itemIndex === -1 ? pos : pos - (parent.clientHeight - row.offsetHeight) / 2;
      }
      lastHash.current = eventId;
      lastRqTs.current = rqts;
    }
  }, [location, data]);

  //
  // Define table columns and additional styling
  //

  const channelFps = channelConfig?.fps || 25;
  const columns = useMemo(() => getRundownColumns(channelFps), [channelFps]);

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
    const ids = data.flatMap((row) =>
      row.id_asset && selectedItems.includes(row.id) ? [row.id_asset] : []
    );
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
      // all fields: channel fields may include keys that aren't asset fields
      const res = await nebula.assetsGet({
        path: { asset_id: id_asset },
        throwOnError: true,
      });
      const meta: Record<string, any> = res.data;
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
    run_mode: RunMode
  ) => {
    updateObject(object_type, id, { run_mode });
  };

  // The scheduler's event dialog, saved through the scheduler (it moves the
  // event and retimes the rundown)
  const canEditEvents =
    currentChannelId !== null &&
    nebula.can('scheduler_view', currentChannelId) &&
    nebula.can('scheduler_edit', currentChannelId);

  const editEvent = async (id: number | string) => {
    if (!canEditEvents || currentChannelId === null) return;
    const event = await showEventDialog(showDialog, currentChannelId, Number(id));
    if (!event) return;
    try {
      await nebula.scheduler({
        body: { id_channel: currentChannelId, events: [event] },
        throwOnError: true,
      });
      loadRundown();
    } catch (err) {
      onError(err);
    }
  };

  const editItem = async (id: number | string) => {
    const object_type = 'item';
    let objectData: Record<string, unknown> = {};
    try {
      const res = await nebula.get({
        body: { object_type, ids: [Number(id)] },
        throwOnError: true,
      });
      objectData = res.data.data?.[0] ?? {};
    } catch (err) {
      onError(err);
      return;
    }

    // Create a field list based on the item role

    const itemRole = objectData.item_role;
    const idAsset = objectData.id_asset as number | null | undefined;
    let fields: Array<{ name: string }>;
    if (itemRole === 'placeholder' || itemRole === 'live') {
      fields = [{ name: 'title' }, { name: 'duration' }];
    } else if (itemRole === 'lead_in' || itemRole === 'lead_out') {
      return;
    } else if (idAsset) {
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

    // an item with an asset shows the asset's values it doesn't override

    if (idAsset) {
      try {
        // all fields: the item form has keys that aren't asset fields (note)
        const res = await nebula.assetsGet({
          path: { asset_id: idAsset },
          throwOnError: true,
        });
        const assetData: Record<string, unknown> = res.data;
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

    const objectTitle = typeof objectData.title === 'string' ? objectData.title : '';
    const title = `Edit item: ${objectTitle}`;
    const initialData: Record<string, unknown> = {};
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
      if (event.detail === 2) void editEvent(row.id);
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
        rundownModes.includes('control') &&
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
    const res: ContextMenuOption[] = [];
    if (selectedItems.length) {
      if (selectedItems.length === 1 && focusedObject) {
        res.push({
          label: 'Edit item',
          icon: 'edit',
          onClick: () => {
            void editItem(selectedItems[0]);
          },
        });
        if (focusedObject.id_asset) {
          res.push({
            label: 'Set as primary',
            icon: 'star',
            onClick: () => {
              void onSetPrimary();
            },
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
      if (canEditEvents) {
        res.push({
          label: 'Edit event',
          icon: 'edit',
          onClick: () => {
            void editEvent(selectedEvents[0]);
          },
        });
      }
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

  // Create a new event, the same way an empty event dropped
  // to the scheduler does: ask for the metadata first

  const createEvent = async () => {
    if (currentChannelId === null || !startTime) return;
    const fields = [{ name: 'start' }, ...(channelConfig?.fields || [])];
    const initialData: Record<string, unknown> = {
      start: Math.floor(startTime.getTime() / 1000),
    };

    let meta: Record<string, unknown>;
    try {
      meta = await showDialog('metadata', 'New event', { fields, initialData });
    } catch {
      return; // dialog was cancelled
    }

    const { start, ...eventMeta } = meta;
    const payload: EventData = {
      start: (start as number) || (initialData.start as number),
      meta: eventMeta as EventData['meta'],
    };

    try {
      await nebula.scheduler({
        body: { id_channel: currentChannelId, events: [payload] },
        throwOnError: true,
      });
      loadRundown();
    } catch (err) {
      onError(err);
    }
  };

  if (!loading && !data?.length) {
    return (
      <RundownTableWrapper className="grow nopad" ref={tableRef}>
        <EmptyRundown>
          <p>There are no events scheduled for this day.</p>
          <p>Create an event first, then add items to it here.</p>
          {canEditEvents && (
            <Button
              icon="calendar_add_on"
              label="Create event"
              onClick={() => void createEvent()}
            />
          )}
        </EmptyRundown>
      </RundownTableWrapper>
    );
  }

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
        onDrop={(droppable, dropIndex, dropTarget) => {
          onDrop(droppable.items, dropIndex ?? 0, dropTarget);
        }}
      />
    </RundownTableWrapper>
  );
};

export default RundownTable;
