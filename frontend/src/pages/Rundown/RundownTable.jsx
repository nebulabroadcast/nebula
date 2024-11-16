import Table from '/src/components/table'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
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

const RundownTable = ({
  data,
  draggedObjects,
  onDrop,
  currentItem,
  cuedItem,
  selectedItems,
  setSelectedItems,
  focusedObject,
  setFocusedObject,
  rundownMode,
  loadRundown,
  onError,
}) => {
  const currentChannel = useSelector((state) => state.context.currentChannel)

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

  const onRowClick = (rowData, event) => {
    if (rowData.type === 'event') {
      setSelectedItems([])
      return
    }

    if (event.detail === 2) {
      // doubleClick
      if (rundownMode === 'control' && rowData.type === 'item') {
        nebula
          .request('playout', {
            id_channel: currentChannel,
            action: 'cue',
            payload: { id_item: rowData.id },
          })
          .then(loadRundown)
          .catch(onError)
        return
      }
    }

    let newSelectedItems = []
    if (event.ctrlKey) {
      if (selectedItems.includes(rowData.id)) {
        newSelectedItems = selectedItems.filter((obj) => obj !== rowData.id)
      } else {
        newSelectedItems = [...selectedItems, rowData.id]
      }
    } else if (event.shiftKey) {
      const clickedIndex = data.findIndex((row) => row.id === rowData.id)
      const focusedIndex =
        data.findIndex((row) => row.id === focusedObject.id) ||
        data.findIndex((row) => selectedItems.includes(row.id)) ||
        clickedIndex ||
        0

      const min = Math.min(clickedIndex, focusedIndex)
      const max = Math.max(clickedIndex, focusedIndex)

      // Get the ids of the rows in the range
      const rangeIds = data
        .slice(min, max + 1)
        .filter((row) => row.type === 'item')
        .map((row) => row.id)

      newSelectedItems = [...new Set([...selectedItems, ...rangeIds])]
    } else {
      newSelectedItems = [rowData.id]
    }

    setSelectedItems(newSelectedItems)
    setFocusedObject(rowData)
  }

  const focusNext = (offset) => {
    if (!focusedObject) return
    const nextIndex =
      data.findIndex(
        (row) => row.type === focusedObject.type && row.id === focusedObject.id
      ) + offset
    if (nextIndex < data.length) {
      const nextRow = data[nextIndex]
      setSelectedItems([nextRow.id])
      setFocusedObject(nextRow)
    }
  }

  const deleteSelectedItems = () => {
    if (!selectedItems.length) {
      toast.error('No items selected')
      return
    }
    console.log('Deleting items:', selectedItems)
    nebula
      .request('delete', { object_type: 'item', ids: selectedItems })
      .then(loadRundown)
      .catch(onError)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      focusNext(1)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      focusNext(-1)
      e.preventDefault()
    } else if (e.key === 'Delete') {
      deleteSelectedItems()
      e.preventDefault()
    }
  }

  const selectedIndices = useMemo(() => {
    const selectedIndices = []
    for (let i = 0; i < data?.length || 0; i++) {
      if (selectedItems.includes(data[i].id)) {
        selectedIndices.push(i)
      }
    }
    return selectedIndices
  }, [selectedItems, data])

  return (
    <RundownWrapper className="grow nopad">
      <Table
        columns={columns}
        data={data}
        className="contained"
        rowClass={getRowClass}
        rowHighlightColor={formatRowHighlightColor}
        rowHighlightStyle={formatRowHighlightStyle}
        selection={selectedIndices}
        onRowClick={onRowClick}
        onKeyDown={onKeyDown}
        droppable={draggedObjects}
        onDrop={onDrop}
      />
    </RundownWrapper>
  )
}

export default RundownTable
