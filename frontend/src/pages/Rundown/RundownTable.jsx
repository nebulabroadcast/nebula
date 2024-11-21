import Table from '/src/components/table'
import { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import styled from 'styled-components'
import nebula from '/src/nebula'
import { showSendToDialog } from '/src/actions'

import {
  getColumnWidth,
  getFormatter,
  formatRowHighlightColor,
  formatRowHighlightStyle,
} from '/src/tableFormatting.jsx'
import { Select } from '../../components'

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

const getRunModeOptions = (object_type, selection, func) => {
  if (object_type === 'event') {
    return [
      {
        label: 'Run: Auto',
        icon: 'play_arrow',
        onClick: () => setRunMode('event', selectedEvents[0], 0),
      },
      {
        label: 'Run: Manual',
        icon: 'hand_gesture',
        onClick: () => setRunMode('event', selectedEvents[0], 1),
      },
      {
        label: 'Run: Soft',
        icon: 'hourglass_empty',
        onClick: () => setRunMode('event', selectedEvents[0], 2),
      },
      {
        label: 'Run Hard',
        icon: 'hourglass_bottom',
        onClick: () => setRunMode('event', selectedEvents[0], 3),
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

const RundownTable = ({
  data,
  draggedObjects,
  onDrop,
  currentItem,
  cuedItem,
  selectedItems,
  setSelectedItems,
  selectedEvents,
  setSelectedEvents,
  focusedObject,
  setFocusedObject,
  rundownMode,
  loadRundown,
  onError,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const dispatch = useDispatch()

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
      setSelectedEvents([rowData.id])
      return
    }

    if (rowData.id_asset) {
      const id_asset = rowData.id_asset
      setSearchParams((o) => {
        o.set('asset', id_asset)
        return o
      })
    }

    setSelectedEvents([])
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

  const onSendTo = () => {
    const ids = []
    for (const row of data) {
      if (selectedItems.includes(row.id)) {
        if (row.id_asset) ids.push(row.id_asset)
      }
    }

    if (ids.length) {
      dispatch(showSendToDialog({ ids }))
    }
  }

  const setRunMode = (object_type, id, run_mode) => {
    console.log('Setting run mode:', object_type, id, run_mode)
    const operations = [{ id, object_type, data: { run_mode } }]
    nebula.request('ops', { operations }).then(loadRundown).catch(onError)
  }

  const contextMenu = () => {
    const res = []
    if (selectedItems.length) {
      if (selectedItems.length === 1) {
        res.push(...getRunModeOptions('item', selectedItems[0], setRunMode))
        res.push({
          label: 'Edit item',
          icon: 'edit',
          separator: true,
        })
      }
      res.push(
        {
          label: 'Send to...',
          icon: 'send',
          onClick: onSendTo,
          separator: true,
        },
        {
          label: 'Delete',
          icon: 'delete',
          onClick: deleteSelectedItems,
        }
      )
      return res
    } else if (selectedEvents.length === 1) {
      res.push(...getRunModeOptions('event', selectedEvents[0], setRunMode))
      res.push({
        label: 'Edit event',
        icon: 'edit',
        separator: true,
      })
    }
    return res
  }

  //
  // Render
  //

  const selectedIndices = useMemo(() => {
    const selectedIndices = []
    for (let i = 0; i < data?.length || 0; i++) {
      if (selectedItems.includes(data[i].id) && data[i].type === 'item') {
        selectedIndices.push(i)
      }
      if (selectedEvents.includes(data[i].id) && data[i].type === 'event') {
        selectedIndices.push(i)
      }
    }

    return selectedIndices
  }, [selectedItems, selectedEvents, data])

  return (
    <RundownWrapper className="grow nopad">
      <Table
        columns={columns}
        data={data}
        className="contained"
        onRowClick={onRowClick}
        rowClass={getRowClass}
        rowHighlightColor={formatRowHighlightColor}
        rowHighlightStyle={formatRowHighlightStyle}
        contextMenu={contextMenu}
        selection={selectedIndices}
        onKeyDown={onKeyDown}
        droppable={draggedObjects}
        onDrop={onDrop}
      />
    </RundownWrapper>
  )
}

export default RundownTable
