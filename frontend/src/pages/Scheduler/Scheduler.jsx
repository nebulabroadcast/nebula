import { useState, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { setPageTitle } from '/src/actions'

import Calendar from '/src/containers/Calendar'
import SchedulerNav from './SchedulerNav'
import { getWeekStart, createTitle } from './utils'
import nebula from '/src/nebula'
import { DateTime } from 'luxon'

const Scheduler = ({ draggedAsset }) => {
  const dispatch = useDispatch()
  const [startTime, setStartTime] = useState(getWeekStart())
  const [events, setEvents] = useState([])

  const startTs = useMemo(() => startTime.getTime() / 1000, [startTime])

  const onResponse = (response) => {
    const events = response.data.events
    setEvents(events.filter((e) => e.start >= startTs))
  }

  const requestParams = {
    id_channel: 1,
    date: DateTime.fromJSDate(startTime).toFormat('yyyy-MM-dd'),
  }

  //
  // API calls
  //

  const loadEvents = () => {
    nebula.request('scheduler', requestParams).then(onResponse)
  }

  const setEvent = (event) => {
    const params = { ...requestParams, events: [event] }
    nebula.request('scheduler', params).then(onResponse)
  }

  const deleteEvent = (eventId) => {
    const params = { ...requestParams, delete: [eventId] }
    nebula.request('scheduler', params).then(onResponse)
  }

  //
  // Load data
  //

  useEffect(() => {
    loadEvents()
  }, [startTime])

  useEffect(() => {
    // console.log('Week start time changed', startTime)
    const pageTitle = createTitle(startTime)
    dispatch(setPageTitle({ title: pageTitle }))
  }, [startTime])

  //
  // Context menu
  //

  const contextMenu = [
    {
      label: 'Delete',
      icon: 'delete',
      onClick: (event) => deleteEvent(event.id),
    },
  ]

  //
  // Render
  //

  return (
    <main className="column">
      <SchedulerNav startTime={startTime} setStartTime={setStartTime} />
      <section className="grow nopad">
        <Calendar
          startTime={startTime}
          events={events}
          setEvent={setEvent}
          draggedAsset={draggedAsset}
          contextMenu={contextMenu}
        />
      </section>
    </main>
  )
}

export default Scheduler
