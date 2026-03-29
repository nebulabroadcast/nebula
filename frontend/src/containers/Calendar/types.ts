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
