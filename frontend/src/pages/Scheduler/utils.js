const getWeekStart = () => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const weekStart = new Date(now.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

const createTitle = (startTime) => {
  const start = startTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const end = new Date(
    startTime.getTime() + 6 * 24 * 60 * 60 * 1000
  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Scheduler (${start} - ${end})`
}

export { getWeekStart, createTitle }
