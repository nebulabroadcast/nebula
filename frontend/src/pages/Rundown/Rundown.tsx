import type { TableDraggableItem, TableDropTarget } from '@components/table/types';
import { useDialog } from '@features/Dialogs';
import { useNebula } from '@features/Nebula';
import {
  useWebSocket,
  type PlayoutStatusMessage,
  type WebSocketHandler,
} from '@features/Websocket';
import { useKeyDown } from '@lib/useKeyDown';
import { useLocalStorage } from '@lib/useLocalStorage';
import { dateToDateString, getErrorDetail } from '@lib/utils';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

import type { OrderItem, RundownResponse, RundownRow } from '../../client';

import PlayoutControls from './PlayoutControls';
import RundownEditTools from './RundownEditTools';
import RundownNav from './RundownNav';
import RundownTable from './RundownTable';

import nebula from '@/nebula';

interface RundownProps {
  draggedObjects?: TableDraggableItem[] | null;
}

const Rundown: React.FC<RundownProps> = ({ draggedObjects }) => {
  const showDialog = useDialog();
  const ws = useWebSocket();

  //
  // States
  //

  const { currentChannelId } = useNebula();

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [rundownMode, setRundownMode] = useLocalStorage('mam.rundown.mode', 'edit');

  const [rundown, setRundown] = useState<RundownRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [playoutStatus, setPlayoutStatus] = useState<PlayoutStatusMessage | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<number | string>>([]);
  const [selectedEvents, setSelectedEvents] = useState<Array<number | string>>([]);
  const [focusedObject, setFocusedObject] = useState<RundownRow | null>(null);

  //
  // Sync state with refs (to avoid stale closures)
  //

  const rundownDataRef = useRef<RundownRow[] | null>(rundown);
  const currentDateRef = useRef<Date | null>(startTime);
  const currentChannelRef = useRef<number | null>(currentChannelId);
  const rundownModeRef = useRef<string>(rundownMode);
  const eventIdsRef = useRef<Set<number>>(new Set());
  const playoutStatusRef = useRef<PlayoutStatusMessage | null>(playoutStatus);
  const navigate = useNavigate();

  useEffect(() => {
    rundownDataRef.current = rundown;
  }, [rundown]);

  useEffect(() => {
    currentDateRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    currentChannelRef.current = currentChannelId;
    setPlayoutStatus(null);
  }, [currentChannelId]);

  useEffect(() => {
    rundownModeRef.current = rundownMode;
  }, [rundownMode]);

  useEffect(() => {
    playoutStatusRef.current = playoutStatus;
  }, [playoutStatus]);

  //
  // Go to now
  //

  useKeyDown('n', () => {
    const currentEvent = playoutStatusRef.current?.id_event;
    const currentItem = playoutStatusRef.current?.current_item;
    if (!currentEvent) return;

    const currentPath = window.location.pathname;
    const query = new URLSearchParams(window.location.search);
    if (currentItem != null) query.set('item', currentItem.toString());
    else query.delete('item');
    query.set('rqts', Math.floor(Date.now() / 1000).toString());

    if (currentEvent) {
      let newPath = `${currentPath}?${query.toString()}`;
      newPath += `#${currentEvent}`;
      void navigate(newPath, { replace: true });
    }
  });

  //
  // Load rundown
  //

  const onResponse = (data: RundownResponse) => {
    // the table works with flat rows: lift meta fields to the top level
    const rows = (data.rows ?? []).map(({ meta, ...rest }) => ({
      ...rest,
      ...meta,
    })) as RundownRow[];
    eventIdsRef.current = new Set(
      rows.filter((r) => r.type === 'event').map((r) => r.id)
    );
    setRundown(rows);
    setLoading(false);
  };

  const onError = (error: unknown) => {
    setLoading(false);
    toast.error(
      getErrorDetail(error, error instanceof Error ? error.message : undefined)
    );
  };

  const loadRundown = () => {
    const id_channel = currentChannelRef.current;
    const date = currentDateRef.current;
    if (!startTime || id_channel === null || !date) return;
    setLoading(true);
    const requestParams = {
      date: dateToDateString(date),
      id_channel,
    };
    nebula
      .rundown({ body: requestParams, throwOnError: true })
      .then((response) => {
        onResponse(response.data);
      })
      .catch(onError);
  };

  useEffect(() => {
    loadRundown();
  }, [
    startTime,
    currentChannelId,
    playoutStatus?.current_item,
    playoutStatus?.cued_item,
  ]);

  //
  // Rundown re-ordering
  //

  const onDrop = async (
    items: TableDraggableItem[],
    index: number,
    dropTarget: TableDropTarget | null
  ) => {
    if (rundownModeRef.current !== 'edit') {
      toast.error('Rundown is not in edit mode');
      return;
    }
    const rundown = rundownDataRef.current;
    if (!rundown) return;
    const id_channel = currentChannelRef.current;
    if (id_channel === null) return;

    // Dragging a row that's part of a larger existing selection sends the
    // whole selection, not just that row - make that visible instead of
    // silently inserting more than the user may have intended.
    if (items.length > 1) {
      toast.info(`Inserting ${items.length} items`);
    }

    // Resolve the drop position by the hovered row's stable id/type
    // rather than trusting the raw hover index, which can point at the
    // wrong row (or nothing at all) if the rundown reloaded between the
    // last mousemove and the drop.
    let dropIndex = dropTarget
      ? rundown.findIndex(
          (row) => row.id === dropTarget.id && row.type === dropTarget.type
        )
      : -1;
    if (dropIndex === -1) {
      dropIndex = index;
    }
    const dropAfterRow = rundown[dropIndex];
    if (!dropAfterRow) {
      toast.error('Unable to determine drop position. Please try again.');
      return;
    }
    let i = -1;
    const newOrder: OrderItem[] = [];

    const id_bin = dropAfterRow.id_bin;

    const processItems = async (
      items: TableDraggableItem[],
      targetOrder: OrderItem[]
    ) => {
      for (const item of items) {
        const { type } = item;
        // only assets and items can be placed in a rundown
        if (type !== 'asset' && type !== 'item') continue;
        const id = item.id === undefined ? undefined : Number(item.id);

        if (type === 'asset' && item.subclips?.length) {
          try {
            const res = await showDialog('subclips', '', { asset: item });
            for (const region of res) {
              const smeta: Record<string, unknown> = {};
              if (region.title) smeta.note = region.title;
              if (region.mark_in) smeta.mark_in = region.mark_in;
              if (region.mark_out) smeta.mark_out = region.mark_out;
              targetOrder.push({ id, type: 'asset', meta: smeta });
            }
            continue;
          } catch (err) {
            console.error(err);
            continue;
          }
        }

        const fields: Record<string, unknown> = { ...item };
        const meta: Record<string, unknown> = {};
        let keys: string[] = [];
        if (type === 'item') {
          if (item.item_role) keys = Object.keys(fields);
          else keys = ['mark_in', 'mark_out', 'title', 'subtitle'];
        } else {
          keys = ['mark_in', 'mark_out'];
        }

        for (const key of keys) {
          if (fields[key] !== undefined && fields[key] !== null)
            meta[key] = fields[key];
        }
        targetOrder.push({ id, type, meta });
      }
    };

    for (const row of rundown) {
      i++;
      if (row.id_bin !== id_bin) continue;

      const skip =
        row.type === 'event' ||
        items.some((item) => item.id === row.id && item.type === row.type);

      if (i === dropIndex && row.type === 'event') {
        await processItems(items, newOrder);
      }

      // events are always skipped, so only items get here
      if (!skip && row.type === 'item') newOrder.push({ id: row.id, type: row.type });

      if (i === dropIndex && row.type !== 'event') {
        await processItems(items, newOrder);
      }
    }

    setLoading(true);

    try {
      await nebula.order({
        body: {
          id_channel,
          id_bin: id_bin,
          order: newOrder,
        },
        throwOnError: true,
      });
      loadRundown();
    } catch (error) {
      onError(error);
      setLoading(false);
    }

    setSelectedItems([]);
    setFocusedObject(null);
  };

  //
  // Realtime updates
  //

  useEffect(() => {
    const handlePubSub: WebSocketHandler<'playout_status'> = (_topic, message) => {
      if (message.id_channel === currentChannelRef.current) {
        setPlayoutStatus(message);
      }
    };

    const unsubscribe = ws.subscribe('playout_status', handlePubSub);
    return () => {
      unsubscribe();
    };
  }, [ws]);

  useEffect(() => {
    const handlePubSub: WebSocketHandler<'objects_changed'> = (_topic, message) => {
      if (message.initiator === nebula.senderId) return;
      const { object_type, objects } = message;
      if (object_type !== 'event') return;
      const shouldReload = objects.some((id: number) => eventIdsRef.current.has(id));
      if (shouldReload) loadRundown();
    };

    const unsubscribe = ws.subscribe('objects_changed', handlePubSub);
    return () => {
      unsubscribe();
    };
  }, [ws]);

  //
  // Render
  //

  return (
    <main className="column">
      <RundownNav
        startTime={startTime}
        setStartTime={setStartTime}
        rundownMode={rundownMode}
        setRundownMode={setRundownMode}
      />
      {rundownMode === 'edit' && <RundownEditTools />}
      {rundownMode !== 'edit' && (
        <PlayoutControls
          playoutStatus={playoutStatus}
          rundownMode={rundownMode}
          loadRundown={loadRundown}
          onError={onError}
        />
      )}
      <RundownTable
        data={rundown || []}
        loading={loading}
        draggedObjects={draggedObjects || null}
        onDrop={onDrop}
        currentItem={playoutStatus?.current_item}
        cuedItem={playoutStatus?.cued_item}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        selectedEvents={selectedEvents}
        setSelectedEvents={setSelectedEvents}
        focusedObject={focusedObject}
        setFocusedObject={setFocusedObject}
        rundownMode={rundownMode}
        loadRundown={loadRundown}
        onError={onError}
      />
    </main>
  );
};

export default Rundown;
