import styled from 'styled-components'
import { toast } from 'react-toastify'
import { DateTime } from 'luxon'

import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'

import nebula from '/src/nebula'
import { useDialog } from '/src/hooks'
import { Loader, LoaderWrapper } from '/src/components'
import Calendar from '/src/containers/Calendar'
import SchedulerNav from './SchedulerNav'

const Scheduler = ({ draggedObjects }) => {
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const [loading, setLoading] = useState(false)

  const [startTime, setStartTime] = useState()
  const [events, setEvents] = useState([])
  const showDialog = useDialog()

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel)
  }, [currentChannel])

  const draggedAsset = useMemo(() => {
    if (!draggedObjects) return null
    if (draggedObjects?.length !== 1) {
      toast.error('Please drag only one asset')
      return
    }
    if (!['asset', 'event'].includes(draggedObjects[0]?.type)) return null
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

  const saveEvent = async (event) => {
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

    if (event.is_empty_event && !event.id_asset) {
      // this is a hack. Empty events appear as assets in calendar,
      // but they don't have id_asset, so we cand identify them by this
      // and trigger a dialog to fill in the metadata
      const title = `Edit event: ${event.title || 'Untitled'}`
      const fields = [{ name: 'start' }, ...channelConfig.fields]
      try {
        const r = await showDialog('metadata', title, {
          fields,
          initialData: { start: event.start },
        })
        payload.meta = r
      } catch (e) {
        return
      }
    } else {
      // Copy metadata from the event or the asset to the
      // payload. don't show the metadata dialog
      for (const field of channelConfig?.fields || []) {
        const key = field.name
        if (event[key] === undefined) continue
        payload.meta[key] = event[key]
      }
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
    const message =
      'Are you sure you want to delete unaired events in this week?\n\n' +
      'This action is not undoable. ' +
      'Events and and their items that were not aired will be deleted.'

    showDialog('confirm', 'Delete unaired events', { message })
      .then(() => {
        setLoading(true)
        const eventIds = events.map((e) => e.id)
        const params = { ...requestParams, delete: eventIds }
        nebula.request('scheduler', params).then(loadEvents).catch(onError)
      })
      .catch(() => {})
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
      hlColor: 'var(--color-red)',
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
      </section>
    </main>
  )
}

export default Scheduler
