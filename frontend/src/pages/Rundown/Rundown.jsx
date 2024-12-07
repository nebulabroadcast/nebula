import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useLocalStorage, useDialog } from '/src/hooks'
import { toast } from 'react-toastify'
import nebula from '/src/nebula'

import RundownNav from './RundownNav'
import RundownTable from './RundownTable'
import PlayoutControls from './PlayoutControls'
import RundownEditTools from './RundownEditTools'

const Rundown = ({ draggedObjects }) => {
  const showDialog = useDialog()

  //
  // States
  //

  const currentChannel = useSelector((state) => state.context.currentChannel)

  const [startTime, setStartTime] = useState(null)
  const [rundownMode, setRundownMode] = useLocalStorage('rundownMode', 'edit')

  const [rundown, setRundown] = useState(null)
  const [loading, setLoading] = useState(false)

  const [playoutStatus, setPlayoutStatus] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [selectedEvents, setSelectedEvents] = useState([])
  const [focusedObject, setFocusedObject] = useState(null)

  //
  // Sync state with refs (to avoid stale closures)
  //

  const rundownDataRef = useRef(rundown)
  const currentDateRef = useRef(startTime)
  const currentChannelRef = useRef(currentChannel)
  const rundownModeRef = useRef(rundownMode)

  useEffect(() => {
    rundownDataRef.current = rundown || []
  }, [rundown])

  useEffect(() => {
    currentDateRef.current = startTime
  }, [startTime])

  useEffect(() => {
    currentChannelRef.current = currentChannel
    setPlayoutStatus(null)
  }, [currentChannel])

  useEffect(() => {
    rundownModeRef.current = rundownMode
  }, [rundownMode])

  //
  // Load rundown
  //

  const onResponse = (response) => {
    setRundown(response.data.rows)
    setLoading(false)
  }

  const onError = (error) => {
    setLoading(false)
    const msg = error.response?.data?.detail || error.message
    toast.error(msg)
  }

  const loadRundown = () => {
    if (!startTime) return
    setLoading(true)
    const requestParams = {
      date: currentDateRef.current.toISOString().split('T')[0],
      id_channel: currentChannelRef.current,
    }
    nebula.request('rundown', requestParams).then(onResponse).catch(onError)
  }

  useEffect(() => {
    loadRundown()
  }, [
    startTime,
    currentChannel,
    playoutStatus?.current_item,
    playoutStatus?.cued_item,
  ])

  //
  // Rundown re-ordering
  //

  const onDrop = async (items, index) => {
    if (rundownModeRef.current !== 'edit') {
      toast.error('Rundown is not in edit mode')
      return
    }
    const rundown = rundownDataRef.current
    const dropAfterItem = rundown[index]
    let i = -1
    const newOrder = []
    for (const row of rundown) {
      i++
      if (dropAfterItem.id_bin != row.id_bin) continue

      // skip events and the items that are being dragged
      const skip =
        row.type === 'event' ||
        items.some((item) => item.id === row.id && item.type === row.type)

      // include items that were already in the bin
      if (!skip) newOrder.push({ id: row.id, type: row.type })

      // append the dragged item after the current item
      // TODO: update marks
      if (i == index) {
        console.log('Dropped after', dropAfterItem)
        for (const item of items) {
          const meta = {}
          let keys = []

          // what keys to copy from the source object?
          if (item.type === 'item') {
            // from the virutal items, take everything
            if (item.item_role) keys = Object.keys(item)
            // existing items. should we even care?
            else keys = ['mark_in', 'mark_out', 'title', 'subtitle']
          } else {
            if (item.type === 'asset' && item.subclips?.length) {
              // Asset has subclips
              // Display subclips dialog
              try {
                const res = await showDialog('subclips', null, { asset: item })
                console.log('RES', res)
                for (const region of res) {
                  const smeta = {}
                  if (region.title) smeta.note = region.title
                  if (region.mark_in) smeta.mark_in = region.mark_in
                  if (region.mark_out) smeta.mark_out = region.mark_out
                  newOrder.push({ id: item.id, type: 'asset', meta: smeta })
                }
                // Continue with the next item instead of
                // default action after appending all regions
                // selected in the dialog
                continue
              } catch (err) {
                // dialog aborted
                console.error(err)
                continue
              }
            } else {
              // from assets without subclips, take only the marks
              keys = ['mark_in', 'mark_out']
            }
          }

          for (const key of keys) {
            if (item[key]) meta[key] = item[key]
          }

          console.log('Dropped item', item, meta)
          newOrder.push({ id: item.id, type: item.type, meta })
        }
      }
    } // create a new order array

    setLoading(true)

    try {
      await nebula.request('order', {
        id_channel: currentChannelRef.current,
        id_bin: dropAfterItem.id_bin,
        order: newOrder,
      })
      loadRundown()
    } catch (error) {
      onError(error)
      setLoading(false)
    }

    setSelectedItems([])
    setFocusedObject(null)
  } // onDrop

  //
  // Realtime updates
  //

  const handlePubSub = (topic, message) => {
    if (topic === 'playout_status') {
      if (message.id_channel === currentChannelRef.current) {
        setPlayoutStatus(message)
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line no-undef
    const token = PubSub.subscribe('playout_status', handlePubSub)
    // eslint-disable-next-line no-undef
    return () => PubSub.unsubscribe(token)
  }, [])

  //
  // Render
  //

  return (
    <main className="column">
      <RundownNav
        startTime={startTime}
        setStartTime={setStartTime}
        rundownMode={rundownMode}
        setRundownMode={setRundownMode}
      />
      {rundownMode === 'edit' && <RundownEditTools />}
      {rundownMode !== 'edit' && (
        <PlayoutControls
          playoutStatus={playoutStatus}
          rundownMode={rundownMode}
          loadRundown={loadRundown}
          onError={onError}
        />
      )}
      <RundownTable
        data={rundown}
        loading={loading}
        draggedObjects={draggedObjects}
        onDrop={onDrop}
        currentItem={playoutStatus?.current_item}
        cuedItem={playoutStatus?.cued_item}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        selectedEvents={selectedEvents}
        setSelectedEvents={setSelectedEvents}
        focusedObject={focusedObject}
        setFocusedObject={setFocusedObject}
        rundownMode={rundownMode}
        loadRundown={loadRundown}
        onError={onError}
      />
    </main>
  )
}

export default Rundown
