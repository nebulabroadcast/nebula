import { getTextColor } from '@components/lib/colors';
import { RefObject } from 'react';

import { drawTruncatedText } from './drawUtils';
import { CalendarEvent, DrawParams } from './types';

const drawEvents = (
  ctx: CanvasRenderingContext2D,
  drawParams: RefObject<DrawParams>,
  events: CalendarEvent[],
  draggedEvent: CalendarEvent | null
) => {
  const { dayWidth, hourHeight, time2pos } = drawParams.current;
  const maxY = ctx.canvas.height;

  let i = 0;
  for (const event of events) {
    const { start, title, duration } = event;
    const nextEvent = events[i + 1];
    const nextStart = nextEvent?.start;

    i += 1;
    if (draggedEvent?.id === event?.id) continue;

    const startPos = time2pos(new Date(start * 1000));
    const endPos = nextStart ? time2pos(new Date(nextStart * 1000)) : null;
    const eventDuration = nextStart ? (nextStart - start) * 1000 : null;

    // Compute the event rectangle height

    let eventHeight;
    if (!endPos) eventHeight = maxY - startPos.y;
    else if (endPos.x > startPos.x) eventHeight = maxY - startPos.y;
    else if (eventDuration !== null)
      eventHeight = (eventDuration / (3600 * 1000)) * hourHeight;
    else eventHeight = maxY - startPos.y;

    // Set the fill style to the gradient

    const gradientEnd = startPos.y + eventHeight;
    const gradient = ctx.createLinearGradient(0, startPos.y, 0, gradientEnd);
    let eventColor = '#7287fd'; // default color
    if (event.color){
      const r = (event.color >> 16) & 0xff;
      const g = (event.color >> 8) & 0xff;
      const b = event.color & 0xff;
      eventColor = `rgba(${r}, ${g}, ${b}, .7)`;
    }


    gradient.addColorStop(0, eventColor);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(startPos.x + 10, startPos.y, dayWidth - 10, eventHeight - 2);

    // draw actual duration

    const usedHeight = hourHeight * (duration / 3600);
    ctx.fillStyle =
      nextStart && duration - 30 > nextStart - start ? '#ff2404' : '#5fff5f';
    ctx.fillRect(startPos.x + 10, startPos.y, 3, usedHeight);

    // event title

    ctx.font = '12px Noto Sans';
    ctx.fillStyle = getTextColor(eventColor, 180);
    drawTruncatedText(ctx, startPos.x + 15, startPos.y + 15, dayWidth - 20, title);
  }
};

export default drawEvents;
