import nebula from '/src/nebula'
import styled from 'styled-components'

import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { useDialog, useConfirm } from '/src/hooks'
import { DateTime } from 'luxon'

import { Loader } from '/src/components'
import Calendar from '/src/containers/Calendar'
import SchedulerNav from './SchedulerNav'

const LoaderWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.01);
  display: flex;
  align-items: center;
  justify-content: center;
`

const Scheduler = ({ draggedObjects }) => {
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const [loading, setLoading] = useState(false)

  const [startTime, setStartTime] = useState()
  const [events, setEvents] = useState([])
  const showDialog = useDialog()
  const [ConfirmDialog, confirm] = useConfirm()

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
    setLoading(false)
  }

  const onError = (error) => {
    setLoading(false)
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
    setLoading(true)
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
    setLoading(true)
    nebula.request('scheduler', params).then(onResponse).catch(onError)
  }

  //
  // Context menu
  //

  const editEvent = (event) => {
    const title = `Edit event: ${event.title || 'Untitled'}`
    const fields = [{ name: 'start' }, ...channelConfig.fields]
    showDialog('metadata', title, { fields, initialData: event })
      .then((data) => {
        console.log('Saving', data)
        saveEvent({ ...data })
      })
      .catch(() => {
        console.log('Cancelled')
      })
  }

  const deleteEvent = (eventId) => {
    setLoading(true)
    const params = { ...requestParams, delete: [eventId] }
    nebula.request('scheduler', params).then(loadEvents).catch(onError)
  }

  const deleteUnaired = async () => {
    const question =
      'Are you sure you want to delete unaired events in this week?\n\nThis action is not undoable. Events and and their items that were not aired will be deleted.'
    if (question) {
      const ans = await confirm('Delete unaired events', question)
      if (!ans) return
    }
    setLoading(true)
    const eventIds = events.map((e) => e.id)
    const params = { ...requestParams, delete: eventIds }
    nebula.request('scheduler', params).then(loadEvents).catch(onError)
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
      <SchedulerNav
        setStartTime={setStartTime}
        deleteUnaired={deleteUnaired}
        loadEvents={loadEvents}
        loading={loading}
        setLoading={setLoading}
      />
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
        {loading && (
          <LoaderWrapper>
            <Loader />
          </LoaderWrapper>
        )}
        <ConfirmDialog />
      </section>
    </main>
  )
}

export default Scheduler
