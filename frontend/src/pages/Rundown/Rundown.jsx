import { useState, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocalStorage } from '/src/hooks'
import { toast } from 'react-toastify'
import nebula from '/src/nebula'

import RundownNav from './RundownNav'
import RundownTable from './RundownTable'
import PlayoutControls from './PlayoutControls'
import RundownEditTools from './RundownEditTools'

const Rundown = ({ draggedObjects }) => {
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
  }

  const onError = (error) => {
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
    nebula
      .request('rundown', requestParams)
      .then(onResponse)
      .catch(onError)
      .finally(() => setLoading(false))
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

  const onDrop = (items, index) => {
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
          if (item.type === 'item') {
            for (const key of ['item_role', 'mark_in', 'mark_out', 'title']) {
              if (item[key]) meta[key] = item[key]
            }
          } else if (item.type === 'asset') {
            for (const key of ['mark_in', 'mark_out']) {
              if (item[key]) meta[key] = item[key]
            }
          }

          console.log('Dropped item', item, meta)
          newOrder.push({ id: item.id, type: item.type, meta })
        }
      }
    } // create a new order array

    nebula
      .request('order', {
        id_channel: currentChannelRef.current,
        id_bin: dropAfterItem.id_bin,
        order: newOrder,
      })
      .then(loadRundown)
      .finally(() => {
        setSelectedItems([])
        setFocusedObject(null)
      })
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
