import { useEffect, useState, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useSearchParams } from 'react-router-dom'

import nebula from '/src/nebula'
import { createTitle } from './utils'
import { setPageTitle } from '/src/actions'

import { Navbar, Button, Spacer } from '/src/components'
import ApplySchedulingTemplate from './ApplySchedulingTemplate'

const SchedulerNav = ({
  setStartTime,
  loadEvents,
  deleteUnaired,
  loading,
  setLoading,
}) => {
  const [date, setDate] = useState()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const dispatch = useDispatch()

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel)
  }, [currentChannel])

  useEffect(() => {
    // When the query param `date` changes, update the start time
    // of the calendar view and the page title

    let dateParam = searchParams.get('date')
    if (date && dateParam === date) return
    if (!dateParam) dateParam = new Date().toISOString().split('T')[0]

    const [dsHH, dsMM] = channelConfig.day_start

    const newDate = new Date(dateParam)
    const dayOfWeek = newDate.getDay()
    const diff = newDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(newDate.setDate(diff))
    weekStart.setHours(dsHH, dsMM, 0, 0)

    const pageTitle = createTitle(weekStart, channelConfig.name)
    dispatch(setPageTitle({ title: pageTitle }))
    setStartTime(weekStart)
    setDate(dateParam)
  }, [searchParams, channelConfig])

  useEffect(() => {
    if (date && date !== searchParams.get('date')) {
      setSearchParams((o) => {
        o.set('date', date)
        return o
      })
    }
  }, [date, channelConfig])

  const dateStep = (days) => {
    let dateParam = searchParams.get('date')
    if (!dateParam) dateParam = new Date().toISOString().split('T')[0]
    const currentDate = new Date(dateParam)
    const newDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000)
    setSearchParams((o) => {
      o.set('date', newDate.toISOString().split('T')[0])
      return o
    })
  }

  const prevWeek = () => dateStep(-7)
  const nextWeek = () => dateStep(7)

  return (
    <Navbar>
      <Button icon="chevron_left" onClick={prevWeek} disabled={loading} />
      <Button icon="chevron_right" onClick={nextWeek} disabled={loading} />
      <Spacer />
      <ApplySchedulingTemplate
        loadEvents={loadEvents}
        date={date}
        loading={loading}
        setLoading={setLoading}
      />
      <Button
        icon="delete"
        label="Delete unaired"
        onClick={deleteUnaired}
        disabled={loading}
      />
    </Navbar>
  )
}

export default SchedulerNav
