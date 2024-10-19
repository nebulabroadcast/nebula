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
    .event-row {
      background-color: black;
    }
  }
`

const getRowClass = (rowData) => {
  if (rowData.type === 'event') {
    return 'event-row'
  }
}

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

const RundownTable = ({ data }) => {
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

  return (
    <RundownWrapper className="grow nopad">
      <Table
        keyField="id"
        columns={columns}
        data={data}
        className="contained"
        rowClass={getRowClass}
        rowHighlightColor={formatRowHighlightColor}
        rowHighlightStyle={formatRowHighlightStyle}
      />
    </RundownWrapper>
  )
}

export default RundownTable
