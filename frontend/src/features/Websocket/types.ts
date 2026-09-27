import type { JobState, ObjectType, ServiceState } from '@/client';

// Websocket payloads are not part of the OpenAPI schema: the backend sends
// them as keyword arguments of nebula.msg(), and playout_status comes from
// the playout controller. Keep these in sync with the senders.

interface WebSocketMessageBase {
  // nebula.senderId of the client whose request caused the message
  initiator?: string | null;
}

export interface ObjectsChangedMessage extends WebSocketMessageBase {
  object_type: ObjectType;
  objects: number[];
}

export interface PlayoutStatusMessage extends WebSocketMessageBase {
  id_channel: number;
  fps: number;
  current_fname: string | null;
  cued_fname: string | null;
  request_time: number;
  paused: boolean;
  position: number;
  duration: number;
  current_item: number | null;
  cued_item: number | null;
  current_title: string | null;
  cued_title: string | null;
  loop: boolean;
  cueing: boolean;
  id_event: number | null;
}

export interface WebSocketJobProgressMessage extends WebSocketMessageBase {
  id: number;
  status: JobState;
  progress: number;
  message?: string;
  id_asset?: number;
}

export interface ServiceStateMessage extends WebSocketMessageBase {
  id: number;
  state: ServiceState;
  last_seen_before: number;
  autostart: boolean;
}

export interface WebSocketTopics {
  objects_changed: ObjectsChangedMessage;
  playout_status: PlayoutStatusMessage;
  job_progress: WebSocketJobProgressMessage;
  service_state: ServiceStateMessage;
}

export type WebSocketTopic = keyof WebSocketTopics;

export type WebSocketHandler<K extends WebSocketTopic> = (
  topic: K,
  message: WebSocketTopics[K]
) => void;

export interface WebSocketContextType {
  isConnected: boolean;
  subscribe: <K extends WebSocketTopic>(
    topic: K,
    handler: WebSocketHandler<K>
  ) => () => void;
}
