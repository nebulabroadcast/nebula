import styled from 'styled-components'
import { useRef, useEffect, useState } from 'react'
import CalendarWrapper from './CalendarWrapper'
import ZoomControl from './ZoomControl'

const CalendarCanvas = styled.canvas`
  background-color: #24202e;
`

const Calendar = () => {
  const calendarRef = useRef(null)
  const dayRef = useRef(null)
  const wrapperRef = useRef(null)

  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [currentTime, setCurrentTime] = useState(null)
  const [mousePos, setMousePos] = useState(null)

  const clockWidth = 100
  const offsetHours = 7
  const offsetMinutes = 0

  const pos2time = (x, y) => {
    if (!dayRef.current || !calendarRef.current) {
      return
    }
    const dayWidth = dayRef.current.clientWidth
    const hourHeight = calendarRef.current.clientHeight / 24
    const day = Math.floor(x / dayWidth)
    let hour = Math.floor(y / hourHeight) + offsetHours
    let minute =
      Math.floor(((y % hourHeight) / hourHeight) * 60) + offsetMinutes
    // round to nearest 5 minutes
    minute = Math.round(minute / 5) * 5
    if (minute >= 60) {
      minute = 0
      hour += 1
    }
    return { day, hour, minute }
  }

  const drawCalendar = () => {
    if (!dayRef.current || !calendarRef.current) {
      return
    }

    const dayWidth = dayRef.current.clientWidth

    const canvas = calendarRef.current
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < 24; i++) {
      let y = (ctx.canvas.height / 24) * i
      if (i === 0) {
        continue
      }
      y += 4
      ctx.font = '14px Arial'
      ctx.fillStyle = '#c0c0c0'
      const hours = (i + offsetHours).toString().padStart(2, '0')
      const minutes = offsetMinutes.toString().padStart(2, '0')
      const clock = `${hours}:${minutes}`
      ctx.fillText(clock, 14, y)
    }

    for (let i = 0; i < 7; i++) {
      let x = ((ctx.canvas.width - clockWidth) / 7) * i
      x += 2
      x += clockWidth

      for (let j = 0; j < 24; j++) {
        const hourHeight = ctx.canvas.height / 24
        const y = hourHeight * j

        if (j > 0) {
          ctx.beginPath()
          ctx.strokeStyle = '#d7d4d5'
          ctx.lineWidth = 1
          ctx.moveTo(x, y)
          ctx.lineTo(x + dayWidth - 4, y)
          ctx.stroke()
        }

        if (ctx.canvas.height / 24 > 40) {
          for (let k = 1; k < 4; k++) {
            const qy = y + (hourHeight / 4) * k

            ctx.beginPath()
            ctx.strokeStyle = '#646464'
            ctx.lineWidth = 1
            ctx.moveTo(x, qy)
            ctx.lineTo(x + dayWidth - 4, qy)
            ctx.stroke()
          }
        }
      }
    }

    if (currentTime && mousePos) {
      const { day, hour, minute } = currentTime
      const { x, y } = mousePos
      const dayName = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ][day - 1]
      ctx.fillText(`${dayName} ${hour}:${minute}`, x, y)
    }
  }

  useEffect(() => {
    //drawCalendar()
  }, [currentTime])

  const resizeCanvas = () => {
    const canvas = calendarRef.current
    canvas.width = canvas.parentElement.clientWidth
    canvas.height = canvas.parentElement.clientHeight * zoom

    const bodyWrapper = calendarRef.current.parentElement
    const scrollbarWidth = bodyWrapper.offsetWidth - bodyWrapper.clientWidth
    setScrollbarWidth(scrollbarWidth)

    drawCalendar()
  }

  const onMouseMove = (e) => {
    if (!calendarRef?.current) {
      return
    }
    const rect = calendarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newTime = pos2time(x, y)
    setMousePos({ x, y })

    if (JSON.stringify(newTime) !== JSON.stringify(currentTime)) {
      setCurrentTime(newTime)
    }
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

  return (
    <CalendarWrapper scrollbarWidth={scrollbarWidth} clockWidth={clockWidth}>
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
