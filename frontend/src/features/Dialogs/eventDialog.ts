import { getErrorDetail } from '@lib/utils';
import { toast } from 'react-toastify';

import type { ShowDialog } from './registry';

import type { EventData } from '@/client';
import nebula from '@/nebula';

// Edits an event (scheduler, rundown): its start and the channel's event
// fields. Resolves with what to send to the scheduler endpoint, or null
// when cancelled or the event can't be loaded
export const showEventDialog = async (
  showDialog: ShowDialog,
  id_channel: number,
  id_event: number
): Promise<EventData | null> => {
  const channel = nebula.getPlayoutChannel(id_channel);
  if (!channel) return null;
  const fields = [{ name: 'start' }, ...(channel.fields || [])];

  let event: Record<string, unknown>;
  try {
    const res = await nebula.get({
      body: { object_type: 'event', ids: [id_event] },
      throwOnError: true,
    });
    event = res.data.data?.[0] ?? {};
  } catch (error) {
    toast.error(getErrorDetail(error));
    return null;
  }

  const initialData: Record<string, unknown> = {};
  for (const field of fields) initialData[field.name] = event[field.name];
  const title =
    typeof event.title === 'string' && event.title ? event.title : 'Untitled';

  let data: Record<string, unknown>;
  try {
    data = await showDialog('metadata', `Edit event: ${title}`, {
      fields,
      initialData,
    });
  } catch {
    return null; // cancelled
  }
  const { start, ...meta } = data;
  return {
    id: id_event,
    start: (start as number | undefined) ?? (event.start as number),
    meta: meta as EventData['meta'],
  };
};
