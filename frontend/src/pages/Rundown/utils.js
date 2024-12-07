import nebula from '/src/nebula'
import { getColumnWidth, getFormatter } from '/src/tableFormat'

const getRunModeOptions = (object_type, selection, func) => {
  if (object_type === 'event') {
    return [
      {
        label: 'Run: Auto',
        icon: 'play_arrow',
        onClick: () => func('event', selection, 0),
      },
      {
        label: 'Run: Manual',
        icon: 'hand_gesture',
        onClick: () => func('event', selection, 1),
      },
      {
        label: 'Run: Soft',
        icon: 'hourglass_empty',
        onClick: () => func('event', selection, 2),
      },
      {
        label: 'Run Hard',
        icon: 'hourglass_bottom',
        onClick: () => func('event', selection, 3),
      },
    ]
  }
  if (object_type === 'item') {
    return [
      {
        label: 'Run: Auto',
        icon: 'play_arrow',
        onClick: () => func('item', selection, 0),
      },
      {
        label: 'Run: Manual',
        icon: 'hand_gesture',
        onClick: () => func('item', selection, 1),
      },
      {
        label: 'Run: Skip',
        icon: 'skip_next',
        onClick: () => func('item', selection, 4),
      },
    ]
  }
}

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
]

const getRundownColumns = () => {
  return RUNDOWN_COLUMNS.map((key) => {
    return {
      title: nebula.metaHeader(key),
      name: key,
      width: getColumnWidth(key),
      formatter: getFormatter(key),
    }
  })
}

export { getRunModeOptions, getRundownColumns }
