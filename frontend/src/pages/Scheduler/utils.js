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

export { createTitle }
