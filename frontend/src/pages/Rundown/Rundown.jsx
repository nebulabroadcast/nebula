import { useState, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import nebula from '/src/nebula'

import RundownNav from './RundownNav'
import RundownTable from './RundownTable'
import PlayoutControls from './PlayoutControls'

const Rundown = ({ draggedObject }) => {
  const [startTime, setStartTime] = useState(null)
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const [rundown, setRundown] = useState(null)
  const [playoutStatus, setPlayoutStatus] = useState(null)

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

  const onDrop = (item, index) => {
    const rundown = rundownDataRef.current

    const dropAfterItem = rundown[index]
    let i = -1
    const newOrder = []
    for (const row of rundown) {
      i++
      if (dropAfterItem.id_bin != row.id_bin) continue

      //skip the item that is being dragged
      if (item.id == row.id && item.type === row.type) continue

      // do not include events
      if (row.type === 'event') continue

      // include items that were already in the bin
      newOrder.push({ id: row.id, type: row.type })

      //append the dragged item after the current item
      // TODO: update marks
      if (i == index) {
        console.log('Dropped after', dropAfterItem)
        newOrder.push({ id: item.id, type: item.type })
      }
    }

    nebula
      .request('order', {
        id_channel: currentChannelRef.current,
        id_bin: dropAfterItem.id_bin,
        order: newOrder,
      })
      .then(loadRundown)
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
      <RundownNav startTime={startTime} setStartTime={setStartTime} />
      <PlayoutControls playoutStatus={playoutStatus} />
      <RundownTable
        data={rundown}
        draggedObject={draggedObject}
        onDrop={onDrop}
        currentItem={playoutStatus?.current_item}
        cuedItem={playoutStatus?.cued_item}
      />
    </main>
  )
}

export default Rundown
