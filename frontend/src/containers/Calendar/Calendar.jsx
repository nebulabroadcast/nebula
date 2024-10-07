import styled from 'styled-components'
import { useRef, useEffect, useState, useCallback } from 'react'
import CalendarWrapper from './CalendarWrapper'
import ZoomControl from './ZoomControl'
import { useDroppable } from '@dnd-kit/core'
import drawMarks from './drawMarks'
import drawEvents from './drawEvents'

const CalendarCanvas = styled.canvas`
  background-color: #24202e;
`

const CLOCK_WIDTH = 40

const Calendar = ({ startTime, draggedAsset, events, setEvent }) => {
  const calendarRef = useRef(null)
  const dayRef = useRef(null)
  const wrapperRef = useRef(null)

  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [currentTime, setCurrentTime] = useState(null)
  const [mousePos, setMousePos] = useState(null)
  const [draggedEvent, setDraggedEvent] = useState(null)

  // Drawing parameters

  const drawParams = useRef({})
  const eventsRef = useRef([])

  useEffect(() => {
    eventsRef.current = events
  }, [events])

  const pos2time = (x, y) => {
    if (x < CLOCK_WIDTH) return null
    if (y < 0) return null
    const _x = x - CLOCK_WIDTH
    const { dayWidth, hourHeight } = drawParams.current
    if (!dayRef.current || !calendarRef.current) return null
    let offsetSeconds = Math.floor((y / hourHeight) * 60 * 60) // vertical offset
    offsetSeconds += Math.floor(_x / dayWidth) * 24 * 60 * 60 // day offset
    offsetSeconds = Math.round(offsetSeconds / 300) * 300 // round to 5 minutes
    const resultDate = new Date(startTime.getTime() + offsetSeconds * 1000)
    return resultDate
  }

  const time2pos = (time) => {
    const { dayWidth, hourHeight } = drawParams.current
    const offsetSeconds = (time - startTime) / 1000
    const dayOffset = Math.floor(offsetSeconds / (24 * 60 * 60))
    const x = CLOCK_WIDTH + dayOffset * dayWidth
    const y = ((offsetSeconds % (24 * 60 * 60)) / (60 * 60)) * hourHeight
    return { x, y }
  }

  const eventAtPos = () => {
    if (!currentTime) return null
    const currentTs = currentTime.getTime() / 1000
    let i = 0
    for (const event of events) {
      i += 1
      const { start, duration, title } = event
      const nextEvent = events[i]
      const nextStart = nextEvent?.start || start + duration
      if (currentTs >= start && currentTs <= nextStart) {
        return event
      }
    }
    return null
  }

  useEffect(() => {
    if (!dayRef.current) return
    if (!startTime) return
    drawParams.current.hourHeight =
      (calendarRef.current?.clientHeight || 0) / 24
    drawParams.current.dayWidth = dayRef.current.clientWidth
    drawParams.current.pos2time = pos2time
    drawParams.current.time2pos = time2pos
    drawParams.current.startTime = startTime
  }, [drawParams.current, dayRef.current, zoom, startTime])

  //
  // Draw calendar
  //

  const drawCalendar = () => {
    if (!dayRef.current || !calendarRef.current) return
    const canvas = calendarRef.current
    const ctx = canvas.getContext('2d')
    const { dayWidth, hourHeight } = drawParams.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawMarks(ctx, drawParams)
    if (eventsRef.current) {
      drawEvents(ctx, drawParams, eventsRef.current, draggedEvent)
    }

    if (currentTime && mousePos) {
      const { x, y } = mousePos

      if (draggedAsset) {
        ctx.fillStyle = '#fff'
        ctx.fillText(
          `${Math.round(x)}:${Math.round(y)} ${currentTime.toLocaleString()}: ${
            draggedAsset.title
          }`,
          x + 10,
          y + 50
        )

        const timePos = time2pos(currentTime)
        ctx.beginPath()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.rect(
          timePos.x + 10,
          timePos.y,
          dayWidth - 10,
          hourHeight * (draggedAsset.duration / 3600)
        )
        ctx.fill()
      } else if (draggedEvent) {
        ctx.fillStyle = '#cff'
        ctx.fillText(
          `${Math.round(x)}:${Math.round(y)} ${currentTime.toLocaleString()}: ${
            draggedEvent.title
          }`,
          x + 10,
          y + 50
        )

        const timePos = time2pos(currentTime)
        ctx.beginPath()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.rect(
          timePos.x + 10,
          timePos.y,
          dayWidth - 10,
          hourHeight * ((draggedEvent.duration || 300) / 3600)
        )
        ctx.fill()
      }
    }
  }

  //
  // Event handlers
  //

  useEffect(() => {
    drawCalendar()
  }, [currentTime, events])

  const onMouseMove = (e) => {
    const { pos2time } = drawParams.current
    if (!calendarRef?.current) {
      return
    }

    const rect = calendarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newTime = pos2time(x, y)
    setMousePos({ x, y })

    if (newTime !== currentTime) {
      setCurrentTime(newTime)
    }
  }

  //
  // Mouse position within the calendar (Track current time)
  //

  const onMouseUp = (e) => {
    console.log('mouseup', e)
    if (!calendarRef?.current) return
    if (draggedAsset && currentTime) {
      console.log('Dropped', draggedAsset, currentTime)
      setEvent({
        id_asset: draggedAsset.id,
        start: currentTime.getTime() / 1000,
      })
    } else if (draggedEvent) {
      console.log('Dropped event', draggedEvent)

      setEvent({
        id: draggedEvent.id,
        start: currentTime.getTime() / 1000,
      })
    }

    setDraggedEvent(null)
  }

  const onMouseDown = (evt) => {
    const pos = { x: evt.clientX, y: evt.clientY }
    const event = eventAtPos(pos.x, pos.y)
    if (event) {
      setDraggedEvent(event)
    }
  }

  useEffect(() => {
    if (!calendarRef.current) return
    calendarRef.current.addEventListener('mousemove', onMouseMove)
    return () => {
      if (!calendarRef.current) return
      calendarRef.current.removeEventListener('mousemove', onMouseMove)
    }
  }, [calendarRef.current])

  //
  // Handle calendar resizing
  //

  const resizeCanvas = () => {
    const canvas = calendarRef.current
    if (!canvas?.parentElement) return
    canvas.width = canvas.parentElement.clientWidth
    canvas.height = canvas.parentElement.clientHeight * zoom

    const bodyWrapper = calendarRef.current.parentElement
    const scrollbarWidth = bodyWrapper.offsetWidth - bodyWrapper.clientWidth
    setScrollbarWidth(scrollbarWidth)

    drawParams.current.dayWidth = dayRef.current.clientWidth
    drawParams.current.hourHeight = calendarRef.current.clientHeight / 24

    drawCalendar()
  }

  useEffect(() => {
    console.log('Zoom', zoom)
    resizeCanvas()
  }, [zoom])

  useEffect(() => {
    if (!wrapperRef.current) return
    const resizeObserver = new ResizeObserver(() => resizeCanvas())
    resizeObserver.observe(wrapperRef.current)
    return () => {
      if (wrapperRef.current) {
        resizeObserver.unobserve(wrapperRef.current)
      }
    }
  }, [wrapperRef.current])

  //
  // Render
  //

  return (
    <CalendarWrapper scrollbarWidth={scrollbarWidth} clockWidth={CLOCK_WIDTH}>
      <div className="calendar-header">
        <div className="calendar-day" ref={dayRef}>
          Monday
        </div>
        <div className="calendar-day">Tuesday</div>
        <div className="calendar-day">Wednesday</div>
        <div className="calendar-day">Thursday</div>
        <div className="calendar-day">Friday</div>
        <div className="calendar-day">Saturday</div>
        <div className="calendar-day">Sunday</div>
      </div>
      <div className="calendar-body">
        <div className="calendar-body-wrapper" ref={wrapperRef}>
          <CalendarCanvas
            id="calendar"
            ref={calendarRef}
            onMouseUp={onMouseUp}
            onMouseDown={onMouseDown}
          />
        </div>
      </div>
      <div className="calendar-footer">
        <ZoomControl zoom={zoom} setZoom={setZoom} />
        {draggedAsset && <span>{draggedAsset.title}</span>}
        {draggedEvent && <span>{draggedEvent.title}</span>}
      </div>
    </CalendarWrapper>
  )
}

export default Calendar
