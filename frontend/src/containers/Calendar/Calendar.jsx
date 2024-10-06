import styled from 'styled-components'
import { useRef, useEffect, useState } from 'react'
import CalendarWrapper from './CalendarWrapper'
import ZoomControl from './ZoomControl'

const CalendarCanvas = styled.canvas`
  background-color: #24202e;
`

const CLOCK_WIDTH = 100

const Calendar = ({ startTime }) => {
  const calendarRef = useRef(null)
  const dayRef = useRef(null)
  const wrapperRef = useRef(null)

  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [currentTime, setCurrentTime] = useState(null)
  const [mousePos, setMousePos] = useState(null)

  // Drawing parameters

  const drawParams = useRef({})

  useEffect(() => {
    if (!dayRef.current) return
    drawParams.current.dayWidth = dayRef.current.clientWidth
  }, [drawParams.current, dayRef.current])

  useEffect(() => {
    if (!calendarRef.current) return
    drawParams.current.hourHeight = calendarRef.current.clientHeight / 24
  }, [drawParams.current, calendarRef.current, zoom])

  //
  //
  //

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

  const drawMarks = (ctx) => {
    const { dayWidth, hourHeight } = drawParams.current

    const startHour = startTime.getHours()
    const startMinute = startTime.getMinutes()

    // get the first time AFTER the start time that
    // is a multiple of 15 minutes

    const firstTime = new Date(startTime)
    firstTime.setMinutes(startMinute + ((15 - (startMinute % 15)) % 15))
    firstTime.setHours(
      startHour + (startMinute + ((15 - (startMinute % 15)) % 15)) / 60
    )

    for (let i = 0; i < 24 * 4; i++) {
      const timeMarker = new Date(firstTime.getTime() + i * 15 * 60000)
      const { x, y } = time2pos(timeMarker)

      for (let i = 0; i < 7; i++) {
        const x1 = x + i * dayWidth + 10
        const x2 = x1 + dayWidth - 10
        ctx.beginPath()
        ctx.strokeStyle = '#444'
        ctx.setLineDash([5, 5])
        ctx.moveTo(x1, y)
        ctx.lineTo(x2, y)
        ctx.stroke()
        ctx.setLineDash([]) // Reset to solid lines for other drawings
      }
    }
  }

  const drawCalendar = () => {
    if (!dayRef.current || !calendarRef.current) return
    const canvas = calendarRef.current
    const ctx = canvas.getContext('2d')
    const { dayWidth, hourHeight } = drawParams.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawMarks(ctx)

    if (currentTime && mousePos) {
      const { x, y } = mousePos

      ctx.fillStyle = '#fff'
      ctx.fillText(
        `${Math.round(x)}:${Math.round(y)} ${currentTime.toLocaleString()}`,
        x + 10,
        y + 50
      )

      const timePos = time2pos(currentTime)
      ctx.strokeStyle = 'red'
      ctx.beginPath()
      ctx.moveTo(timePos.x, timePos.y)
      ctx.lineTo(timePos.x + drawParams.current.dayWidth, timePos.y)
      ctx.stroke()
    }
  }

  useEffect(() => {
    drawCalendar()
  }, [currentTime])

  const onMouseMove = (e) => {
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
          <CalendarCanvas id="calendar" ref={calendarRef} />
        </div>
      </div>
      <div className="calendar-footer">
        <ZoomControl zoom={zoom} setZoom={setZoom} />
      </div>
    </CalendarWrapper>
  )
}

export default Calendar
