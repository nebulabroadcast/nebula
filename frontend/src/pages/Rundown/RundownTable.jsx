import Table from '/src/components/table'
import { useMemo } from 'react'
import styled from 'styled-components'
import nebula from '/src/nebula'

import {
  getColumnWidth,
  getFormatter,
  formatRowHighlightColor,
  formatRowHighlightStyle,
} from '/src/tableFormatting.jsx'

const RundownWrapper = styled.section`
  tbody {
    tr {
      border-left: 0 !important;
    }

    .current-item {
      background-color: var(--color-red-muted) !important;
    }

    .cued-item {
      background-color: var(--color-green-muted) !important;
    }

    .event-row {
      background-color: var(--color-surface-01);
      &:hover {
        background-color: var(--color-surface-01);
      }

      td {
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }
    }
  }
`

const COLUMNS = [
  'title',
  'id_folder',
  'status',
  'duration',
  'scheduled_time',
  'broadcast_time',
  'mark_in',
  'mark_out',
]

const RundownTable = ({
  data,
  draggedObject,
  onDrop,
  currentItem,
  cuedItem,
}) => {
  const columns = useMemo(() => {
    return COLUMNS.map((key) => {
      return {
        key: key,
        title: nebula.metaHeader(key),
        name: key,
        width: getColumnWidth(key),
        formatter: getFormatter(key),
      }
    })
  }, [])

  const getRowClass = (rowData) => {
    if (rowData.type === 'event') {
      return 'event-row'
    }
    if (rowData.id === currentItem) return 'current-item'
    if (rowData.id === cuedItem) return 'cued-item'
  }

  return (
    <RundownWrapper className="grow nopad">
      <Table
        columns={columns}
        data={data}
        className="contained"
        rowClass={getRowClass}
        rowHighlightColor={formatRowHighlightColor}
        rowHighlightStyle={formatRowHighlightStyle}
        droppable={draggedObject}
        onDrop={onDrop}
      />
    </RundownWrapper>
  )
}

export default RundownTable
