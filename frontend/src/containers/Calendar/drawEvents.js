const drawEvents = (ctx, drawParams, events, draggedEvent) => {
  const { dayWidth, hourHeight, time2pos } = drawParams.current
  const maxY = ctx.canvas.height

  let i = 0
  for (const event of events) {
    const { start, title, duration } = event
    const nextEvent = events[i + 1]
    const nextStart = nextEvent?.start || start + duration

    i += 1
    if (draggedEvent?.id === event?.id) continue

    const startPos = time2pos(start * 1000)
    const endPos = time2pos(nextStart * 1000)
    const eventDuration = (nextStart - start) * 1000

    const gradientEnd = endPos.x > startPos.x ? maxY : endPos.y
    const eventHeight =
      endPos.x > startPos.x
        ? maxY - startPos.y
        : (eventDuration / 3600) * hourHeight

    // Set the fill style to the gradient

    const usedHeight = hourHeight * (duration / 3600)
    const gradient = ctx.createLinearGradient(0, startPos.y, 0, gradientEnd)
    gradient.addColorStop(0, '#885bff')
    gradient.addColorStop(1, 'transparent')

    ctx.fillStyle = gradient
    ctx.fillRect(startPos.x + 10, startPos.y, dayWidth - 10, eventHeight)

    ctx.fillStyle = duration - 30 > nextStart - start ? '#ff2404' : '#5fff5f'

    ctx.fillRect(startPos.x + 10, startPos.y, 3, usedHeight)

    ctx.font = '12px Arial'
    ctx.fillStyle = '#fff'
    ctx.fillText(title, startPos.x + 15, startPos.y + 15)
  }
}

export default drawEvents
