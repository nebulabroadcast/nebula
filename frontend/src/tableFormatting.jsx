import nebula from '/src/nebula'
import clsx from 'clsx'
import styled from 'styled-components'
import { Timecode } from '@wfoxall/timeframe'
import { Timestamp } from '/src/components'

import './tableFormatting.scss'

const QC_STATES = [
  'new',
  'auto_rejected',
  'auto_accepted',
  'rejected',
  'accepted',
]

const STATUSES = [
  'offline',
  'online',
  'creating',
  'trashed',
  'archived',
  'reset',
  'corrupted',
  'remote',
  'unknown',
  'aired',
  'onair',
  'retrieving',
]

const RUN_MODES = ['Auto', 'Manual', 'Soft', 'Hard', 'Skip']

const formatRundownSymbol = (rowData) => {
  if (rowData.type !== 'item') {
    return <td></td>
  }

  const style = {}
  let icon = ''
  if (rowData.id_asset) {
    const folder = nebula.settings.folders.find(
      (f) => f.id === rowData.id_folder
    )
    style.color = folder?.color
    icon = 'fiber_manual_record'
  } else {
    //todo
    icon = 'crop_square'
  }

  return (
    <td style={{ padding: 0 }}>
      <span className="icon material-symbols-outlined" style={style}>
        {icon}
      </span>
    </td>
  )
}

const formatRowHighlightColor = (rowData) => {
  switch (rowData['status']) {
    case 0:
      return 'var(--color-red)'
    case 2:
      return 'var(--color-yellow)' // creating
    case 3:
      return 'var(--color-violet)' // trashed
    case 4:
      return 'var(--color-blue)' // archived
    case 5:
      return 'var(--color-yellow)' // reset
    case 6:
      return 'var(--color-red)' // corrupted
    case 7:
      return 'var(--color-yellow)' // ready
    case 11:
      return 'var(--color-yellow)' // retrieving
    default:
      return 'transparent'
  }
}

const formatRowHighlightStyle = (rowData) => {
  switch (rowData['status']) {
    case 5:
      return 'dashed'
    case 6:
      return 'dashed'
    case 7:
      return 'dashed'
    default:
      return 'solid'
  }
}

// Column width

const getColumnWidth = (key) => {
  if (!['title', 'subtitle', 'description'].includes(key)) return '1px'
}

// Field formatters

const getDefaultFormatter = (key) => {
  const metaType = nebula.metaType(key)
  switch (metaType.type) {
    case 'boolean':
      // eslint-disable-next-line
      return (rowData, key) => <td>{rowData[key] ? '✓' : ''}</td>

    case 'datetime':
      // eslint-disable-next-line
      return (rowData, key) => (
        <td>
          <Timestamp timestamp={rowData[key]} mode={metaType.mode} />
        </td>
      )

    case 'select':
      // eslint-disable-next-line
      return (rowData, key) => {
        if (!metaType.cs) return <td>{rowData[key]}</td>

        const option = nebula
          .csOptions(metaType.cs)
          .find((opt) => opt.value === rowData[key])

        return <td>{option?.title}</td>
      }

    case 'list':
      // eslint-disable-next-line
      return (rowData, key) => {
        if (!metaType.cs) return <td>{rowData[key].join(', ')}</td>
        const options = nebula
          .csOptions(metaType.cs)
          .filter((opt) => rowData[key].includes(opt.value))
        return <td>{options.map((opt) => opt.title).join(', ')}</td>
      }

    default:
      // eslint-disable-next-line
      return (rowData, key) => <td>{rowData[key]}</td>
  } // switch metaType
}

const getFormatter = (key) => {
  if (['subtitle', 'description'].includes(key))
    // eslint-disable-next-line
    return (rowData, key) => <td>{rowData[key]}</td>

  switch (key) {
    case 'title':
      return (rowData, key) => {
        const title = rowData[key]
        const subtitle = rowData.subtitle
        return (
          <td>
            <span>{title}</span>
            {subtitle && (
              <>
                <span style={{ color: 'var(--color-text-dim)' }}>
                  {nebula.settings.system.subtitle_separator}
                  {subtitle}
                </span>
              </>
            )}
          </td>
        )
      }

    case 'qc/state':
      // eslint-disable-next-line
      return (rowData, key) => {
        const qcState = QC_STATES[rowData[key]]
        return (
          <td className={clsx('qc-state', qcState)}>
            <div />
          </td>
        )
      }

    case 'id_folder':
      // eslint-disable-next-line
      return (rowData, key) => {
        const folder = nebula.settings.folders.find(
          (f) => f.id === rowData[key]
        )
        return <td style={{ color: folder?.color }}>{folder?.name}</td>
      }

    case 'rundown_symbol':
      return (rowData, key) => formatRundownSymbol(rowData)

    case 'duration':
      // eslint-disable-next-line
      return (rowData, key) => {
        const fps = rowData['video/fps_f'] || 25
        let duration = rowData[key] || 0
        if (rowData.mark_out) duration = rowData.mark_out
        if (rowData.mark_in) duration -= rowData.mark_in
        const trimmed = duration < rowData.duration
        const timecode = new Timecode(duration * fps, fps)
        const title =
          trimmed &&
          `Original duration ${new Timecode(rowData.duration * fps, fps)}`
        return (
          <td title={title || ''}>
            {timecode.toString().substring(0, 11)}
            {trimmed && '*'}
          </td>
        )
      }

    case 'status':
      return (rowData, key) => {
        const status = STATUSES[rowData[key]]
        return <td className={clsx('status', status)}>{status}</td>
      }

    case 'run_mode':
      return (rowData, key) => {
        const runMode = RUN_MODES[rowData[key] || 0]
        return <td className={'run-mode'}>{runMode}</td>
      }

    case 'created_by':
      // eslint-disable-next-line
      return (rowData, key) => {
        return <td>{nebula.getUserName(rowData[key])}</td>
      }

    case 'updated_by':
      // eslint-disable-next-line
      return (rowData, key) => {
        return <td>{nebula.getUserName(rowData[key])}</td>
      }

    default:
      return getDefaultFormatter(key)
  } // end switch key
} // end getFormatter

export {
  getColumnWidth,
  getFormatter,
  formatRowHighlightColor,
  formatRowHighlightStyle,
}
