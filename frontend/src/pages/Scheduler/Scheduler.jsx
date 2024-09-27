import { useState, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { setPageTitle } from '/src/actions'

import Calendar from '/src/containers/Calendar'
import SchedulerNav from './SchedulerNav'

const getWeekStart = () => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const weekStart = new Date(now.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

const Scheduler = () => {
  const dispatch = useDispatch()
  const [startDate, setStartDate] = useState(getWeekStart())

  const pageTitle = useMemo(() => {
    const start = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    const end = new Date(
      startDate.getTime() + 6 * 24 * 60 * 60 * 1000
    ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `Scheduler (${start} - ${end})`
  }, [startDate])

  useEffect(() => {
    dispatch(setPageTitle({ title: pageTitle }))
  }, [])

  return (
    <main className="column">
      <SchedulerNav />
      <section className="grow nopad">
        <Calendar />
      </section>
    </main>
  )
}

export default Scheduler
