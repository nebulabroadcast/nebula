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

  const requestParams = {
    id_channel: 1,
    date: DateTime.fromJSDate(startTime).toFormat('yyyy-MM-dd'),
  }

  const loadEvents = () => {
    nebula.request('scheduler', requestParams).then((response) => {
      setEvents(response.data.events)
    })
  }

  const setEvent = (event) => {
    const params = { ...requestParams, events: [event] }
    nebula.request('scheduler', params).then((response) => {
      setEvents(response.data.events)
    })
  }

  useEffect(() => {
    loadEvents()
  }, [startTime])

  useEffect(() => {
    console.log('Week start time changed', startTime)
    const pageTitle = createTitle(startTime)
    dispatch(setPageTitle({ title: pageTitle }))
  }, [startTime])

  return (
    <main className="column">
      <SchedulerNav startTime={startTime} setStartTime={setStartTime} />
      <section className="grow nopad">
        <Calendar
          startTime={startTime}
          events={events}
          setEvent={setEvent}
          draggedAsset={draggedAsset}
        />
      </section>
    </main>
  )
}

export default Scheduler
