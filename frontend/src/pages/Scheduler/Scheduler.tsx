import { Section, Loader, LoaderWrapper } from '@components';
import { TableDraggableItem } from '@components/table/types';
import Calendar from '@containers/Calendar';
import {
  CalendarEvent,
  ContextMenuItem,
  DraggedExternal,
} from '@containers/Calendar/types';
import { useDialog } from '@features/Dialogs';
import { useWebSocket } from '@features/Websocket';
import { DateTime } from 'luxon';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';

import SchedulerNav from './SchedulerNav';

import type { EventData } from '@/client';
import { useNebula } from '@/features/Nebula';
import nebula from '@/nebula';

interface SchedulerProps {
  draggedObjects?: TableDraggableItem[] | null;
}

const Scheduler: React.FC<SchedulerProps> = ({ draggedObjects }) => {
  const { currentChannelId } = useNebula();
  const [loading, setLoading] = useState(false);

  const [startTime, setStartTime] = useState<Date>();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const showDialog = useDialog();

  const eventIdsRef = useRef<Set<string | number>>(new Set());
  const ws = useWebSocket();

  const channelConfig = useMemo(() => {
    if (currentChannelId === null) return undefined;
    return nebula.getPlayoutChannel(currentChannelId);
  }, [currentChannelId]);

  const draggedExternal = useMemo((): DraggedExternal | null => {
    if (!draggedObjects || draggedObjects.length === 0) return null;
    if (draggedObjects.length !== 1) {
      toast.error('Please drag only one asset');
      return null;
    }
    const obj = draggedObjects[0];
    if (!['asset', 'event'].includes(obj.type)) return null;
    console.log('Dragged external object', obj);
    return {
      id: obj.id,
      type: obj.type as 'asset' | 'event',
      duration: obj.duration,
      title: obj.title,
    };
  }, [draggedObjects]);

  //
  // API calls
  //

  const requestParams = useMemo(
    () => ({
      id_channel: currentChannelId,
      date: startTime ? DateTime.fromJSDate(startTime).toFormat('yyyy-MM-dd') : '',
    }),
    [currentChannelId, startTime]
  );

  const onResponse = (response: any) => {
    const fetchedEvents = response.data.events as CalendarEvent[];
    const startTs = startTime ? startTime.getTime() / 1000 : 0;
    eventIdsRef.current = new Set(fetchedEvents.map((e) => e.id));
    setEvents(fetchedEvents.filter((e) => e.start >= startTs));
    setLoading(false);
  };

  const onError = (error: any) => {
    setLoading(false);
    toast.error('Scheduler API error');
    console.log('Scheduler API error', error);
  };

  // Loading events from the server

  const loadEvents = () => {
    if (!startTime || currentChannelId === null) return;
    setLoading(true);
    nebula
      .scheduler({
        body: { ...requestParams, id_channel: currentChannelId },
        throwOnError: true,
      })
      .then(onResponse)
      .catch(onError);
  };

  // Saving events to the server

  const copyEvent = async (id: string | number, newTs: number) => {
    if (!channelConfig) return;
    const fields = [{ name: 'start' }, ...(channelConfig.fields || [])];
    const initialData: Record<string, any> = {};
    const finalData: Record<string, any> = {};

    try {
      const res = await nebula.get({
        body: { object_type: 'event', ids: [Number(id)] },
        throwOnError: true,
      });
      const edata = res.data.data?.[0] || {};
      for (const field of fields) {
        initialData[field.name] = edata[field.name];
      }
      finalData.id_asset = edata.id_asset;
    } catch (e) {
      console.error('Unable to load event', e);
      return;
    }
    initialData.start = newTs;

    try {
      const title = `Copy event: ${initialData.title || 'Untitled'}`;
      const res = await showDialog('metadata', title, { fields, initialData });
      for (const field of fields) {
        finalData[field.name] = res[field.name] || null;
      }
      void saveEvent(finalData);
    } catch {
      console.log('User cancelled event copy');
    }
  };

  const saveEvent = async (event: any) => {
    if (currentChannelId === null) return;
    const payload: Record<string, any> = {
      start: event.start,
      meta: {},
    };

    if (event.id_asset) payload.id_asset = event.id_asset;

    // Prevent jumping during server-side update
    if (event.id) {
      payload.id = event.id;
      const newEvents = [...events];
      for (let i = 0; i < newEvents.length; i++) {
        if (newEvents[i].id === event.id) {
          newEvents[i] = { ...newEvents[i], ...event };
          break;
        }
      }
      setEvents(newEvents);
    }

    if (event.is_empty_event && !event.id_asset) {
      // this is a hack. Empty events appear as assets in calendar,
      // but they don't have id_asset, so we cand identify them by this
      // and trigger a dialog to fill in the metadata
      const title = `Edit event: ${event.title || 'Untitled'}`;
      const fields = [{ name: 'start' }, ...(channelConfig?.fields || [])];
      const initialData: Record<string, any> = {};
      for (const field of fields) {
        const key = field.name;
        if (event[key] !== undefined) initialData[key] = event[key];
      }
      try {
        const r = await showDialog('metadata', title, {
          fields,
          initialData,
        });
        payload.meta = r;
        if (r.start) payload.start = r.start;
      } catch {
        return;
      }
    } else {
      // Copy metadata from the event or the asset to the
      // payload. don't show the metadata dialog
      for (const field of channelConfig?.fields || []) {
        const key = field.name;
        if (event[key] === undefined) continue;
        payload.meta[key] = event[key];
      }
    }

    const params = {
      ...requestParams,
      id_channel: currentChannelId,
      events: [payload] as EventData[],
    };
    setLoading(true);
    nebula
      .scheduler({ body: params, throwOnError: true })
      .then(onResponse)
      .catch(onError);
  };

  const saveSeriesEvents = (seriesEvents: EventData[]) => {
    if (currentChannelId === null || seriesEvents.length === 0) return;
    const params = {
      ...requestParams,
      id_channel: currentChannelId,
      events: seriesEvents,
    };
    setLoading(true);
    nebula
      .scheduler({ body: params, throwOnError: true })
      .then(onResponse)
      .catch(onError);
  };

  // CTRL+drop of a series episode: open the series scheduling dialog
  // instead of creating a single event, unless the dropped asset doesn't
  // belong to a series - then behave like a normal drop.

  const onSeriesDrop = async (dragged: DraggedExternal, time: Date) => {
    const start = Math.floor(time.getTime() / 1000);

    let serieId: unknown;
    try {
      const res = await nebula.get({
        body: { object_type: 'asset', ids: [Number(dragged.id)] },
        throwOnError: true,
      });
      serieId = res.data.data?.[0]?.serie;
    } catch (e) {
      console.error('Failed to load asset metadata', e);
    }

    if (!serieId) {
      void saveEvent({ id_asset: dragged.id, is_empty_event: true, start });
      return;
    }

    try {
      const events = await showDialog('seriesSchedule', 'Schedule series', {
        anchorAssetId: Number(dragged.id),
        serieId,
        anchorStart: start,
      });
      saveSeriesEvents(events as EventData[]);
    } catch {
      console.log('User cancelled series scheduling');
    }
  };

  //
  // Context menu
  //

  const editEvent = async (event: CalendarEvent) => {
    if (!channelConfig) return;
    const title = `Edit event: ${event.title || 'Untitled'}`;
    const fields = [{ name: 'start' }, ...(channelConfig.fields || [])];

    const initialData: Record<string, any> = {};
    if (event.id) {
      try {
        const res = await nebula.get({
          body: { object_type: 'event', ids: [Number(event.id)] },
          throwOnError: true,
        });
        const edata = res.data.data?.[0] || {};
        for (const field of fields) {
          initialData[field.name] = edata[field.name];
        }
      } catch (e) {
        console.error('Failed to load event', e);
      }
    }

    try {
      const r = await showDialog('metadata', title, { fields, initialData });
      void saveEvent({ ...r, id: event.id });
    } catch {
      //
    }
  };

  const deleteEvent = (eventId: string | number) => {
    if (currentChannelId === null) return;
    setLoading(true);
    const params = {
      ...requestParams,
      id_channel: currentChannelId,
      delete: [Number(eventId)],
    };
    nebula
      .scheduler({ body: params, throwOnError: true })
      .then(loadEvents)
      .catch(onError);
  };

  const deleteUnaired = () => {
    const message =
      'Are you sure you want to delete unaired events in this week?\n\n' +
      'This action is not undoable. ' +
      'Events and and their items that were not aired will be deleted.';

    showDialog('confirm', 'Delete unaired events', { message })
      .then(() => {
        if (currentChannelId === null) return;
        setLoading(true);
        const eventIds = events.map((e) => Number(e.id));
        const params = {
          ...requestParams,
          id_channel: currentChannelId,
          delete: eventIds,
        };
        nebula
          .scheduler({ body: params, throwOnError: true })
          .then(loadEvents)
          .catch(onError);
      })
      .catch(() => {
        // dialog dismissed, do nothing
      });
  };

  const contextMenu: ContextMenuItem[] = [
    {
      label: 'Edit',
      icon: 'edit',
      onClick: (event) => {
        void editEvent(event);
      },
    },
    {
      label: 'Delete',
      icon: 'delete',
      hlColor: 'var(--color-red)',
      onClick: (event) => {
        deleteEvent(event.id);
      },
    },
  ];

  //
  // Load data and render
  //

  useEffect(() => {
    if (!startTime || currentChannelId === null) return;
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, currentChannelId]);

  useEffect(() => {
    const handlePubSub = (topic: string, message: any) => {
      if (message.initiator === nebula.senderId) return;
      if (topic !== 'objects_changed') return;
      const { object_type, objects } = message;
      if (object_type !== 'event') return;
      const shouldReload = (objects as Array<string | number>).some((id) =>
        eventIdsRef.current.has(id)
      );
      if (shouldReload) loadEvents();
    }; // handlePubSub
    const unsubscribe = ws.subscribe('objects_changed', handlePubSub);
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws]);

  return (
    <main className="column">
      <SchedulerNav
        setStartTime={setStartTime}
        deleteUnaired={deleteUnaired}
        loadEvents={loadEvents}
        loading={loading}
        setLoading={setLoading}
      />
      <Section className="grow nopad">
        {startTime && (
          <Calendar
            startTime={startTime}
            events={events}
            saveEvent={saveEvent}
            copyEvent={copyEvent}
            draggedExternal={draggedExternal}
            onSeriesDrop={onSeriesDrop}
            contextMenu={contextMenu}
          />
        )}
        {loading && (
          <LoaderWrapper>
            <Loader />
          </LoaderWrapper>
        )}
      </Section>
    </main>
  );
};

export default Scheduler;
