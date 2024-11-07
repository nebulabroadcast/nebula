import { useState, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import nebula from '/src/nebula'

import RundownNav from './RundownNav'
import RundownTable from './RundownTable'

const Rundown = ({ draggedObject }) => {
  const [startTime, setStartTime] = useState(null)
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const [rundown, setRundown] = useState(null)

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
  }, [startTime, currentChannel])

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

  return (
    <main className="column">
      <RundownNav startTime={startTime} setStartTime={setStartTime} />
      <RundownTable
        data={rundown}
        draggedObject={draggedObject}
        onDrop={onDrop}
      />
    </main>
  )
}

export default Rundown
