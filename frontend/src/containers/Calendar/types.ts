export interface CalendarEvent {
  id: string | number;
  start: number; // Unix timestamp in seconds
  title: string;
  duration: number; // Duration in seconds
  color?: number;
}

export interface DrawParams {
  dayWidth: number;
  hourHeight: number;
  startTime: Date;
  time2pos: (time: Date) => { x: number; y: number };
  pos2time: (x: number, y: number) => Date | null;
}

export interface DraggedExternal {
  id: string | number;
  type: 'asset' | 'event';
  duration?: number;
  title?: string;
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  hlColor?: string;
  onClick: (event: CalendarEvent) => void;
}

// Event handed to saveEvent. Keys besides the known ones are event metadata.
export interface SchedulerEventInput {
  start: number;
  id?: string | number;
  id_asset?: string | number;
  // asset dropped on an empty slot: ask for the event metadata first
  is_empty_event?: boolean;
  title?: string;
  [key: string]: unknown;
}
