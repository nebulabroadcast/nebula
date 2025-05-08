import nebula from '/src/nebula';

import styled from 'styled-components';
import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

import CalendarWrapper from './CalendarWrapper';
import ZoomControl from './ZoomControl';

import ContextMenu from '/src/components/ContextMenu';

import drawMarks from './drawMarks';
import drawEvents from './drawEvents';

import { useLocalStorage } from '/src/hooks';

const CalendarCanvas = styled.canvas`
  background-color: #24202e;
`;

const CLOCK_WIDTH = 40;
const DRAG_THRESHOLD = 10;

const Calendar = ({
  startTime,
  draggedAsset,
  events,
  saveEvent,
  copyEvent,
  contextMenu,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const calendarRef = useRef(null);
  const dayRef = useRef(null);
  const wrapperRef = useRef(null);
  const cursorTime = useRef(null);

  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [zoom, setZoom] = useLocalStorage('calendarZoom', 1);
  const [scrollPos, setScrollPos] = useLocalStorage('calendarPos', 0);
  const [mousePos, setMousePos] = useState(null);

  // Reference to events

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Dragging support

  const initialMousePos = useRef(null);
  const lastClickedEvent = useRef(null);
  const draggedEvent = useRef(null);

  // Drawing parameters

  const drawParams = useRef({});
  const eventsRef = useRef([]);

  // Time functions

  const dayStartOffsetSeconds = useMemo(() => {
    const midnight = new Date(startTime);
    midnight.setHours(0, 0, 0, 0);
    const offset = (startTime.getTime() - midnight.getTime()) / 1000;
    return offset;
  }, [startTime]);

  const pos2time = (x, y) => {
    if (x < CLOCK_WIDTH) return null;
    //if (y < 0) return null
    const _y = Math.max(y, 1);
    const _x = x - CLOCK_WIDTH;
    const { dayWidth, hourHeight } = drawParams.current;
    if (!dayRef.current || !calendarRef.current) return null;
    let offsetSeconds = Math.floor((_y / hourHeight) * 60 * 60); // vertical offset
    offsetSeconds += Math.floor(_x / dayWidth) * 24 * 60 * 60; // day offset
    offsetSeconds = Math.round(offsetSeconds / 300) * 300; // round to 5 minutes
    const resultDate = new Date(startTime.getTime() + offsetSeconds * 1000);
    return resultDate;
  };

  const time2pos = (time) => {
    const { dayWidth, hourHeight } = drawParams.current;
    const offsetSeconds = (time - startTime) / 1000;
    const dayOffset = Math.floor(offsetSeconds / (24 * 60 * 60));
    const x = CLOCK_WIDTH + dayOffset * dayWidth;
    const y = ((offsetSeconds % (24 * 60 * 60)) / (60 * 60)) * hourHeight;
    return { x, y };
  };

  const eventAtPos = useCallback(() => {
    if (!cursorTime.current) return null;
    const currentTs = cursorTime.current.getTime() / 1000;

    // Get the current day midnight (for comparing dates)
    const currentMidnight = new Date((currentTs - dayStartOffsetSeconds) * 1000);
    currentMidnight.setHours(0, 0, 0, 0);

    // When the next day starts (unix timestamp)
    const nextDayStartTs = currentTs - dayStartOffsetSeconds + 24 * 60 * 60;

    let i = 0;
    for (const event of events) {
      i += 1;
      // start and nextStart are unix timestamps
      const { start } = event;

      // Get the next event start time
      const nextEvent = events[i];
      let nextStart = nextEvent?.start;

      // if nextStart is not defined or is in the next day, use the end of the day
      if (!nextStart || nextStart > nextDayStartTs) nextStart = nextDayStartTs;

      if (currentTs >= start && currentTs < nextStart) {
        // skip events that are not on the current day
        // (empty space at the beginning of the day)
        const edate = new Date((start - dayStartOffsetSeconds) * 1000).getDate();
        if (edate !== currentMidnight.getDate()) continue;

        // event fits, returning
        return event;
      }
    }
    // no valid event under the cursor
    return null;
  }, [events, dayStartOffsetSeconds]);

  // Update drawParams reference

  useEffect(() => {
    if (!dayRef.current) return;
    if (!startTime) return;
    drawParams.current.hourHeight = (calendarRef.current?.clientHeight || 0) / 24;
    drawParams.current.dayWidth = dayRef.current.clientWidth;
    drawParams.current.pos2time = pos2time;
    drawParams.current.time2pos = time2pos;
    drawParams.current.startTime = startTime;
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawParams.current, dayRef.current, zoom, startTime]);

  //
  // Draw calendar
  //

  const drawCalendar = () => {
    if (!dayRef.current || !calendarRef.current) return;
    const canvas = calendarRef.current;
    const ctx = canvas.getContext('2d');
    const { dayWidth, hourHeight } = drawParams.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawMarks(ctx, drawParams);
    if (eventsRef.current) {
      drawEvents(ctx, drawParams, eventsRef.current, draggedEvent.current);
    }

    if (cursorTime.current && mousePos) {
      const { x, y } = mousePos;

      if (draggedAsset) {
        ctx.fillStyle = '#fff';
        ctx.fillText(
          `${cursorTime.current.toLocaleString(nebula.locale)}`,
          x + 10,
          y + 20
        );

        const timePos = time2pos(cursorTime.current);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.rect(
          timePos.x + 10,
          timePos.y,
          dayWidth - 10,
          hourHeight * (draggedAsset.duration / 3600)
        );
        ctx.fill();
      } else if (draggedEvent.current) {
        ctx.fillStyle = '#cff';
        ctx.fillText(
          `${cursorTime.current.toLocaleString()}: ${draggedEvent.current.title}`,
          x + 20,
          y + 30
        );

        const timePos = time2pos(cursorTime.current);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.rect(
          timePos.x + 10,
          timePos.y,
          dayWidth - 10,
          hourHeight * ((draggedEvent.current.duration || 300) / 3600)
        );
        ctx.fill();
      }
    }
  };

  // When to draw?

  useEffect(() => {
    drawCalendar();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorTime.current, events]);

  // Event handlers

  const onMouseMove = (e) => {
    if (!calendarRef?.current) return;

    // get pos2time from drawParams to avoid stale closure
    const { pos2time, hourHeight } = drawParams.current;

    // Calculate mouse position
    const rect = calendarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // TODO align yoffset based on y position (subtract on top, add on bottom)
    const yoffset = draggedEvent.current
      ? hourHeight * (Math.max(draggedEvent.current?.duration || 1200) / 7200)
      : 0;

    let newTime = pos2time(x, y - yoffset);
    setMousePos({ x, y });

    // Update current time

    if (newTime !== cursorTime.current) {
      cursorTime.current = newTime;
    }

    // Start dragging after reaching some distance

    if (initialMousePos.current && !draggedEvent.current) {
      const distance = Math.sqrt(
        Math.pow(x - initialMousePos.current.x, 2) +
          Math.pow(y - initialMousePos.current.y, 2)
      );
      if (distance > DRAG_THRESHOLD) {
        draggedEvent.current = lastClickedEvent.current;
      } else {
        draggedEvent.current = null;
      }
    } // start dragging
  }; // onMouseMove

  //
  // Clicking
  //

  const openEventInRundown = (event) => {
    const basePath = '/mam/rundown';
    const searchParams = new URLSearchParams(location.search);
    const startTs = event.start; // TODO: ensure we don't need any offset here
    const targetDate = new Date(startTs * 1000).toISOString().slice(0, 10);
    searchParams.set('date', targetDate);
    const hash = `#${event.id}`;
    const fullPath = `${basePath}?${searchParams.toString()}${hash}`;
    navigate(fullPath);
  };

  const onClick = (evt) => {
    //handle double click on event
    const pos = { x: evt.clientX, y: evt.clientY };
    const rect = calendarRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    initialMousePos.current = { x, y };
    const event = eventAtPos(pos.x, pos.y);

    // on double click, navigate to event details
    if (evt.detail === 2 && event) {
      openEventInRundown(event);
    }
  };

  const onMouseUp = (e) => {
    if (!calendarRef?.current) return;
    if (draggedAsset && cursorTime.current) {
      console.debug('Dropped asset', draggedAsset, cursorTime.current);
      saveEvent({
        id_asset: draggedAsset.id,
        is_empty_event: true,
        start: Math.floor(cursorTime.current.getTime() / 1000),
      });
    } else if (draggedEvent.current && cursorTime.current) {
      console.debug('Dropped event', draggedEvent.current, cursorTime.current);

      // handle control key for copying events
      if (e.ctrlKey) {
        console.log('Copying event', draggedEvent.current);
        const newTs = Math.floor(cursorTime.current.getTime() / 1000);
        copyEvent(draggedEvent.current.id, newTs);
      } else {
        saveEvent({
          id: draggedEvent.current.id,
          start: Math.floor(cursorTime.current.getTime() / 1000),
        });
      }
    }

    draggedEvent.current = null;
    lastClickedEvent.current = null;
    initialMousePos.current = null;
  };

  // Keep track where the mouse is
  // and what event was clicked last

  const onMouseDown = (evt) => {
    const pos = { x: evt.clientX, y: evt.clientY };
    const rect = calendarRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    initialMousePos.current = { x, y };
    const event = eventAtPos(pos.x, pos.y);
    if (event) lastClickedEvent.current = event;
  };

  useEffect(() => {
    if (!calendarRef.current) return;
    calendarRef.current.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      if (!calendarRef.current) return;
      calendarRef.current.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarRef.current, startTime]);

  //
  // Handle calendar resizing
  //

  const resizeCanvas = () => {
    const canvas = calendarRef.current;
    if (!canvas?.parentElement) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight * zoom;

    const bodyWrapper = calendarRef.current.parentElement;
    const scrollbarWidth = bodyWrapper.offsetWidth - bodyWrapper.clientWidth;
    setScrollbarWidth(scrollbarWidth);

    drawParams.current.dayWidth = dayRef.current.clientWidth;
    drawParams.current.hourHeight = calendarRef.current.clientHeight / 24;

    drawCalendar();
  };

  useEffect(() => {
    resizeCanvas();
  }, [zoom]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(wrapperRef.current);
    return () => {
      if (wrapperRef.current) {
        resizeObserver.unobserve(wrapperRef.current);
      }
    };
  }, [wrapperRef.current]);

  const contextMenuItems = useCallback(() => {
    const result = [];
    for (const item of contextMenu) {
      result.push({
        label: item.label,
        icon: item.icon,
        hlColor: item.hlColor,
        onClick: (e) => {
          const event = eventAtPos(e.posX, e.posY);
          if (!event) return;
          item.onClick(event);
        },
      });
    }
    return result;
  }, [contextMenu, eventAtPos]);

  const onScroll = (e) => {
    setScrollPos(e.target.scrollTop);
  };

  useEffect(() => {
    if (!wrapperRef.current) return;
    if (wrapperRef.current.scrollTop !== scrollPos) {
      wrapperRef.current.scrollTop = scrollPos;
    }
  }, [scrollPos]);

  //
  // Render
  //

  const dstyles = useMemo(() => {
    const weekStartTs = startTime.getTime() / 1000;
    const todayStartTs = new Date().setHours(0, 0, 0, 0) / 1000 + dayStartOffsetSeconds;

    const dayStyles = [];
    for (let i = 0; i < 7; i++) {
      const dayStartTs = weekStartTs + i * 24 * 3600;
      // get date in YYYY-MM-DD format
      const jsDate = new Date(dayStartTs * 1000);
      const date = jsDate.toISOString().slice(0, 10);
      const dayName = jsDate.toLocaleDateString(nebula.locale, {
        day: 'numeric',
        month: 'short',
        weekday: 'long',
      });

      const style = {};

      if (todayStartTs === dayStartTs) {
        style.borderBottom = '1px solid var(--color-text)';
        style.fontWeight = 'bold';
      } else {
        const color =
          todayStartTs > dayStartTs ? 'var(--color-red)' : 'var(--color-green)';
        style.borderBottom = `1px solid ${color}`;
      }

      dayStyles.push({
        style,
        date,
        dayName,
      });
    }
    return dayStyles;
  }, [startTime, dayStartOffsetSeconds]);

  // yes. this is very ugly, but i need that reference to one day
  // to get its width
  return (
    <CalendarWrapper scrollbarWidth={scrollbarWidth} clockWidth={CLOCK_WIDTH}>
      <div className="calendar-header">
        {dstyles.map((d, i) => {
          const r = i === 0 ? dayRef : null;
          return (
            <div className="calendar-day" style={dstyles[i].style} ref={r} key={i}>
              <NavLink to={`/mam/rundown?date=${dstyles[i].date}`}>
                {dstyles[i].dayName}
              </NavLink>
            </div>
          );
        })}
      </div>
      <div className="calendar-body">
        <div className="calendar-body-wrapper" ref={wrapperRef} onScroll={onScroll}>
          <CalendarCanvas
            id="calendar"
            ref={calendarRef}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onClick={onClick}
          />
        </div>
      </div>
      <div className="calendar-footer">
        <ZoomControl zoom={zoom} setZoom={setZoom} />
      </div>
      {contextMenuItems && (
        <ContextMenu target={calendarRef} options={contextMenuItems} />
      )}
    </CalendarWrapper>
  );
};

export default Calendar;
