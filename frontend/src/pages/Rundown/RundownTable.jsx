import { useMemo, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useSearchParams, useLocation } from 'react-router-dom'

import nebula from '/src/nebula'
import { Table } from '/src/components'
import { showSendToDialog } from '/src/actions'
import { useDialog } from '/src/hooks'
import {
  formatRowHighlightColor,
  formatRowHighlightStyle,
} from '/src/tableFormat'

import RundownTableWrapper from './RundownTableWrapper'
import { getRunModeOptions, getRundownColumns } from './utils'

const RundownTable = ({
  data,
  draggedObjects,
  onDrop,
  currentItem,
  cuedItem,
  loading,
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
  const location = useLocation()
  const lastHash = useRef('')
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const dispatch = useDispatch()
  const tableRef = useRef()
  const showDialog = useDialog()

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel)
  }, [currentChannel])

  //
  // Scroll to the event definded in the hash when the component mounts
  //

  useEffect(() => {
    if (!location.hash) return
    if (!data?.length) return
    if (!tableRef.current) return
    // already scrolled to this hash
    if (lastHash.current === location.hash.slice(1)) return

    // find the index of the event to scroll to
    let scrollToIndex = null
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (row.type === 'event' && row.id == location.hash.slice(1)) {
        scrollToIndex = i
        break
      }
    }
    // get the row element and scroll to it
    const query = `[data-index="${scrollToIndex}"]`
    const row = tableRef.current.querySelector(query)
    if (row) {
      const pos = row.offsetTop - row.parentNode.offsetTop
      const parent = row.parentNode.parentNode.parentNode // he he he
      parent.scrollTop = pos
      lastHash.current = location.hash.slice(1)
    }
  }, [location, data])

  //
  // Define table columns and additional styling
  //

  const columns = useMemo(() => getRundownColumns(), [])

  const getRundownRowClass = (rowData) => {
    if (rowData.type === 'event') return 'event-row'
    if (rowData.id === currentItem) return 'current-item'
    if (rowData.id === cuedItem) return 'cued-item'
  }

  //
  // Operations on selected items
  //

  const deleteSelectedItems = () => {
    if (!selectedItems.length) return
    console.debug('Deleting items:', selectedItems)
    const payload = { object_type: 'item', ids: selectedItems }
    nebula.request('delete', payload).then(loadRundown).catch(onError)
  }

  const onSendTo = () => {
    const ids = data
      .filter((row) => row.id_asset && selectedItems.includes(row.id))
      .map((row) => row.id_asset)
    if (ids.length) dispatch(showSendToDialog({ ids }))
  }

  const onSolve = (solver) => {
    const items = data
      .filter(
        (row) =>
          row.item_role === 'placeholder' && selectedItems.includes(row.id)
      )
      .map((row) => row.id)
    // TODO: dialog to select solver
    nebula.request('solve', { solver, items }).then(loadRundown).catch(onError)
  }

  const updateObject = (object_type, id, data) => {
    const operations = [{ object_type, id, data }]
    nebula.request('ops', { operations }).then(loadRundown).catch(onError)
  }

  const setRunMode = (object_type, id, run_mode) => {
    updateObject(object_type, id, { run_mode })
  }

  const editObject = (object_type, id) => {
    const objectData = data.find(
      (row) => row.id === id && row.type === object_type
    )
    if (!objectData) return // this should never happen

    let fields
    if (objectData.type === 'event') {
      fields = [...channelConfig.fields]
    } else if (objectData.item_role === 'placeholder') {
      fields = [{ name: 'title' }, { name: 'duration' }]
    } else if (objectData.id_asset) {
      fields = [{ name: 'title' }, { name: 'mark_in' }, { name: 'mark_out' }]
    } else if (['lead_in', 'lead_out'].includes(objectData.item_role)) {
      return
    } else {
      return
    }

    const title = `Edit ${objectData.type}: ${objectData.title}`

    const initialData = {}
    for (const field of fields) {
      initialData[field.name] = objectData[field.name]
    }

    showDialog('metadata', title, { fields, initialData })
      .then((newData) => {
        updateObject(objectData.type, objectData.id, newData)
      })
      .catch(onError)
  }

  //
  // User interaction && Selection handling
  //

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
  } // onRowClick

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

  const contextMenu = () => {
    const res = []
    if (selectedItems.length) {
      if (selectedItems.length === 1) {
        res.push(...getRunModeOptions('item', selectedItems[0], setRunMode))
        res.push({
          label: 'Edit item',
          icon: 'edit',
          separator: true,
          onClick: () => editObject('item', selectedItems[0]),
        })
      }
      if (focusedObject.id_asset) {
        res.push({
          label: 'Send to...',
          icon: 'send',
          onClick: onSendTo,
        })
      }
      if (focusedObject.item_role === 'placeholder') {
        for (const solver of channelConfig.solvers) {
          res.push({
            label: `Solve using ${solver}`,
            icon: 'change_circle',
            onClick: () => onSolve(solver),
          })
        }
      }
      res.push({
        label: 'Delete',
        icon: 'delete',
        onClick: deleteSelectedItems,
        separator: true,
      })
      return res
    } else if (selectedEvents.length === 1) {
      res.push(...getRunModeOptions('event', selectedEvents[0], setRunMode))
      res.push({
        label: 'Edit event',
        icon: 'edit',
        separator: true,
        onClick: () => editObject('event', selectedEvents[0]),
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
    <RundownTableWrapper className="grow nopad" ref={tableRef}>
      <Table
        columns={columns}
        data={data}
        className="contained"
        loading={loading}
        onRowClick={onRowClick}
        rowClass={getRundownRowClass}
        rowHighlightColor={formatRowHighlightColor}
        rowHighlightStyle={formatRowHighlightStyle}
        contextMenu={contextMenu}
        selection={selectedIndices}
        onKeyDown={onKeyDown}
        droppable={draggedObjects}
        onDrop={onDrop}
      />
    </RundownTableWrapper>
  )
}

export default RundownTable
