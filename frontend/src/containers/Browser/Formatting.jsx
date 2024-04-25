import nebula from '/src/nebula'
import styled from 'styled-components'
import { Timecode } from '@wfoxall/timeframe'
import { Timestamp } from '/src/components'

const QCState = styled.div`
  display: inline-block;
  &::before {
    content: '⚑';
  }

  &.qc-state-3 {
    color: var(--color-red);
  }

  &.qc-state-4 {
    color: var(--color-green);
  }
`

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
    case 11:
      return 'var(--color-yellow)' // retrieving
    default:
      return 'transparent'
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
          <Timestamp timestamp={rowData[key]} mode={metaType.mode} />{' '}
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
  if (['title', 'subtitle', 'description'].includes(key))
    // eslint-disable-next-line
    return (rowData, key) => <td>{rowData[key]}</td>

  switch (key) {
    case 'qc/state':
      // eslint-disable-next-line
      return (rowData, key) => (
        <td>
          <QCState className={`qc-state-${rowData[key]}`} />
        </td>
      )

    case 'id_folder':
      // eslint-disable-next-line
      return (rowData, key) => {
        const folder = nebula.settings.folders.find(
          (f) => f.id === rowData[key]
        )
        return <td style={{ color: folder?.color }}>{folder?.name}</td>
      }

    case 'duration':
      // eslint-disable-next-line
      return (rowData, key) => {
        const fps = rowData['video/fps_f'] || 25
        const duration = rowData[key] || 0
        const timecode = new Timecode(duration * fps, fps)
        return <td>{timecode.toString().substring(0, 11)}</td>
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

export { getColumnWidth, getFormatter, formatRowHighlightColor }
