import type { ContextMenuOption } from '@components/ContextMenu';
import type { TableColumn } from '@components/table/types';
import { getColumnWidth, getFormatter } from '@lib/tableFormat';

import { RunMode } from '@/client';
import nebula from '@/nebula';

const getRunModeOptions = (
  object_type: 'event' | 'item',
  selection: number | string,
  func: (
    object_type: 'event' | 'item',
    selection: number | string,
    run_mode: RunMode
  ) => void
): ContextMenuOption[] => {
  if (object_type === 'event') {
    return [
      {
        label: 'Run: Auto',
        icon: 'play_arrow',
        separator: true,
        onClick: () => {
          func('event', selection, RunMode.RUN_AUTO);
        },
      },
      {
        label: 'Run: Manual',
        icon: 'hand_gesture',
        onClick: () => {
          func('event', selection, RunMode.RUN_MANUAL);
        },
      },
      {
        label: 'Run: Soft',
        icon: 'hourglass_empty',
        onClick: () => {
          func('event', selection, RunMode.RUN_SOFT);
        },
      },
      {
        label: 'Run Hard',
        icon: 'hourglass_bottom',
        onClick: () => {
          func('event', selection, RunMode.RUN_HARD);
        },
      },
    ];
  }
  if (object_type === 'item') {
    return [
      {
        label: 'Run auto',
        icon: 'play_arrow',
        separator: true,
        onClick: () => {
          func('item', selection, RunMode.RUN_AUTO);
        },
      },
      {
        label: 'Manual',
        icon: 'hand_gesture',
        onClick: () => {
          func('item', selection, RunMode.RUN_MANUAL);
        },
      },
      {
        label: 'Skip',
        icon: 'skip_next',
        onClick: () => {
          func('item', selection, RunMode.RUN_SKIP);
        },
      },
    ];
  }
  return [];
};

const RUNDOWN_COLUMNS = [
  'rundown_symbol',
  'title',
  'id/main',
  'duration',
  'status',
  'run_mode',
  'scheduled_time',
  'broadcast_time',
  'rundown_difference',
  'mark_in',
  'mark_out',
];

const getRundownColumns = (): TableColumn[] => {
  return RUNDOWN_COLUMNS.map((key) => {
    return {
      title: nebula.metaType(key).header,
      name: key,
      width: getColumnWidth(key),
      formatter: getFormatter(key),
    };
  });
};

export { getRunModeOptions, getRundownColumns };
