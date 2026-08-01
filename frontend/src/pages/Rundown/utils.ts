import type { ContextMenuOption } from '@components/ContextMenu';
import type { TableColumn } from '@components/table/types';
import { getColumnWidth, getFormatter } from '@lib/tableFormat';

import nebula from '@/nebula';

const getRunModeOptions = (
  object_type: 'event' | 'item',
  selection: number | string,
  func: (
    object_type: 'event' | 'item',
    selection: number | string,
    run_mode: number
  ) => void
): ContextMenuOption[] => {
  if (object_type === 'event') {
    return [
      {
        label: 'Run: Auto',
        icon: 'play_arrow',
        separator: true,
        onClick: () => {
          func('event', selection, 0);
        },
      },
      {
        label: 'Run: Manual',
        icon: 'hand_gesture',
        onClick: () => {
          func('event', selection, 1);
        },
      },
      {
        label: 'Run: Soft',
        icon: 'hourglass_empty',
        onClick: () => {
          func('event', selection, 2);
        },
      },
      {
        label: 'Run Hard',
        icon: 'hourglass_bottom',
        onClick: () => {
          func('event', selection, 3);
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
          func('item', selection, 0);
        },
      },
      {
        label: 'Manual',
        icon: 'hand_gesture',
        onClick: () => {
          func('item', selection, 1);
        },
      },
      {
        label: 'Skip',
        icon: 'skip_next',
        onClick: () => {
          func('item', selection, 4);
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
