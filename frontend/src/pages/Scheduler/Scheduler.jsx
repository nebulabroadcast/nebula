import { useState, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { setPageTitle } from '/src/actions'

import Calendar from '/src/containers/Calendar'
import SchedulerNav from './SchedulerNav'
import { getWeekStart, createTitle } from './utils'

const Scheduler = () => {
  const dispatch = useDispatch()
  const [startTime, setStartTime] = useState(getWeekStart())

  useEffect(() => {
    const pageTitle = createTitle(startTime)
    dispatch(setPageTitle({ title: pageTitle }))
  }, [startTime])

  return (
    <main className="column">
      <SchedulerNav startTime={startTime} setStartTime={setStartTime} />
      <section className="grow nopad">
        <Calendar />
      </section>
    </main>
  )
}

export default Scheduler
