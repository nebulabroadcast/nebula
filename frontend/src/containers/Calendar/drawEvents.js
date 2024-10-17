const drawEvents = (ctx, drawParams, events, draggedEvent) => {
  const { dayWidth, hourHeight, time2pos } = drawParams.current
  const maxY = ctx.canvas.height

  let i = 0
  for (const event of events) {
    const { start, title, duration } = event
    const nextEvent = events[i + 1]
    const nextStart = nextEvent?.start

    i += 1
    if (draggedEvent?.id === event?.id) continue

    const startPos = time2pos(start * 1000)
    const endPos = nextStart ? time2pos(nextStart * 1000) : null
    const eventDuration = nextStart ? (nextStart - start) * 1000 : null

    let eventHeight
    if (!endPos) eventHeight = maxY - startPos.y
    else if (endPos.x > startPos.x) eventHeight = maxY - startPos.y
    else eventHeight = (eventDuration / (3600 * 1000)) * hourHeight

    // Set the fill style to the gradient

    const gradientEnd = startPos.y + eventHeight
    const gradient = ctx.createLinearGradient(0, startPos.y, 0, gradientEnd)
    gradient.addColorStop(0, '#885bff')
    gradient.addColorStop(1, 'transparent')

    ctx.fillStyle = gradient
    //ctx.fillStyle = '#885bff99'
    ctx.fillRect(startPos.x + 10, startPos.y, dayWidth - 10, eventHeight - 2)

    // draw actual duration
    const usedHeight = hourHeight * (duration / 3600)
    ctx.fillStyle = duration - 30 > nextStart - start ? '#ff2404' : '#5fff5f'
    ctx.fillRect(startPos.x + 10, startPos.y, 3, usedHeight)

    // event title
    ctx.font = '12px Arial'
    ctx.fillStyle = '#fff'
    ctx.fillText(title, startPos.x + 15, startPos.y + 15)
  }
}

export default drawEvents
