import { useState, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocalStorage } from '/src/hooks'
import { toast } from 'react-toastify'
import nebula from '/src/nebula'

import RundownNav from './RundownNav'
import RundownTable from './RundownTable'
import PlayoutControls from './PlayoutControls'

const Rundown = ({ draggedObjects }) => {
  const [startTime, setStartTime] = useState(null)
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const [rundown, setRundown] = useState(null)
  const [playoutStatus, setPlayoutStatus] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [focusedObject, setFocusedObject] = useState(null)
  const [rundownMode, setRundownMode] = useLocalStorage('rundownMode', 'edit')

  const rundownDataRef = useRef(rundown)
  const currentDateRef = useRef(startTime)
  const currentChannelRef = useRef(currentChannel)
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

  const onResponse = (response) => {
    setRundown(response.data.rows)
  }

  const onError = (error) => {
    console.log(error.response)
  }

  const loadRundown = () => {
    if (!startTime) return
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

  const onDrop = (items, index) => {
    if (rundownMode !== 'edit') {
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

      //skip the items that are being dragged
      let skip = false
      for (const item of items) {
        if (item.id === row.id && item.type === row.type) {
          skip = true
          break
        }
      }

      // do not include events
      if (row.type === 'event') skip = true

      // include items that were already in the bin
      if (!skip) newOrder.push({ id: row.id, type: row.type })

      //append the dragged item after the current item
      // TODO: update marks
      if (i == index) {
        console.log('Dropped after', dropAfterItem)
        for (const item of items) {
          newOrder.push({ id: item.id, type: item.type })
        }
      }
    }

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
  }

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

  return (
    <main className="column">
      <RundownNav
        startTime={startTime}
        setStartTime={setStartTime}
        rundownMode={rundownMode}
        setRundownMode={setRundownMode}
      />
      <PlayoutControls
        playoutStatus={playoutStatus}
        rundownMode={rundownMode}
      />
      <RundownTable
        data={rundown}
        draggedObjects={draggedObjects}
        onDrop={onDrop}
        currentItem={playoutStatus?.current_item}
        cuedItem={playoutStatus?.cued_item}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        focusedObject={focusedObject}
        setFocusedObject={setFocusedObject}
      />
    </main>
  )
}

export default Rundown
