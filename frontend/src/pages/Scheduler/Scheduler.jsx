import nebula from '/src/nebula'

import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { useMetadataDialog } from '/src/hooks'
import { DateTime } from 'luxon'

import Calendar from '/src/containers/Calendar'
import SchedulerNav from './SchedulerNav'

const Scheduler = ({ draggedObjects }) => {
  const currentChannel = useSelector((state) => state.context.currentChannel)

  const [startTime, setStartTime] = useState()
  const [events, setEvents] = useState([])
  const showEventDialog = useMetadataDialog()

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel)
  }, [currentChannel])

  const draggedAsset = useMemo(() => {
    if (!draggedObjects) return null
    if (draggedObjects?.length !== 1) {
      toast.error('Please drag only one asset')
      return
    }
    if (draggedObjects[0]?.type !== 'asset') return null
    return draggedObjects[0]
  }, [draggedObjects])

  //
  // API calls
  //

  const onResponse = (response) => {
    const events = response.data.events
    const startTs = startTime.getTime() / 1000
    setEvents(events.filter((e) => e.start >= startTs))
  }

  const onError = (error) => {
    toast.error(
      <>
        <strong>Scheduler API error</strong>
        <br />
        <p>{error.response?.data?.detail || 'Unknown error'}</p>
      </>
    )
  }

  const requestParams = {
    id_channel: currentChannel,
    date: DateTime.fromJSDate(startTime).toFormat('yyyy-MM-dd'),
  }

  // Loading events from the server

  const loadEvents = () => {
    nebula.request('scheduler', requestParams).then(onResponse).catch(onError)
  }

  // Saving events to the server

  const saveEvent = (event) => {
    const payload = {
      start: event.start,
      meta: {},
    }

    if (event.id_asset) payload.id_asset = event.id_asset

    // Prevent jumping during server-side update
    if (event.id) {
      payload.id = event.id
      for (let i = 0; i < events.length; i++) {
        if (events[i].id === event.id) {
          events[i] = event
          break
        }
      }
    }

    for (const field of channelConfig?.fields || []) {
      const key = field.name
      if (event[key] === undefined) continue
      payload.meta[key] = event[key]
    }

    const params = { ...requestParams, events: [payload] }
    nebula.request('scheduler', params).then(onResponse).catch(onError)
  }

  //
  // Context menu
  //

  const editEvent = (event) => {
    const title = `Edit event: ${event.title || 'Untitled'}`
    const fields = [{ name: 'start' }, ...channelConfig.fields]
    showEventDialog(title, fields, event)
      .then(saveEvent)
      .catch(() => {})
  }

  const deleteEvent = (eventId) => {
    const params = { ...requestParams, delete: [eventId] }
    nebula.request('scheduler', params).then(onResponse).catch(onError)
  }

  const contextMenu = [
    {
      label: 'Edit',
      icon: 'edit',
      onClick: editEvent,
    },
    {
      label: 'Delete',
      icon: 'delete',
      onClick: (event) => deleteEvent(event.id),
    },
  ]

  //
  // Load data and render
  //

  useEffect(() => {
    if (!startTime) return
    loadEvents()
  }, [startTime, currentChannel])

  return (
    <main className="column">
      <SchedulerNav setStartTime={setStartTime} loadEvents={loadEvents} />
      <section className="grow nopad">
        {startTime && (
          <Calendar
            startTime={startTime}
            events={events}
            saveEvent={saveEvent}
            draggedAsset={draggedAsset}
            contextMenu={contextMenu}
          />
        )}
      </section>
    </main>
  )
}

export default Scheduler
