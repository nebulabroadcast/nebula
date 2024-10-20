import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { NavLink, useSearchParams } from 'react-router-dom'

import { Navbar, InputText, Button, Spacer } from '/src/components'
import { setPageTitle } from '/src/actions'

const DAY = 24 * 60 * 60 * 1000

const RundownNav = ({ startTime, setStartTime }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const dispatch = useDispatch()

  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (dateParam) {
      const newStartTime = new Date(dateParam)
      newStartTime.setHours(7, 30, 0, 0)
      if (newStartTime.getTime() !== startTime?.getTime()) {
        setStartTime(newStartTime)
      }
    } else {
      const defaultDate = new Date()
      defaultDate.setHours(7, 30, 0, 0)
      setStartTime(defaultDate)
    }
  }, [searchParams])

  useEffect(() => {
    if (!startTime) return
    const dateParam = searchParams.get('date')
    const formattedDate = startTime.toISOString().split('T')[0]
    if (dateParam !== formattedDate) {
      setSearchParams((o) => {
        o.set('date', formattedDate)
        return o
      })
    }
    dispatch(setPageTitle({ title: `Rundown ${formattedDate}` }))
  }, [startTime, setSearchParams])

  const prevDay = () => setStartTime(new Date(startTime.getTime() - DAY))
  const nextDay = () => setStartTime(new Date(startTime.getTime() + DAY))

  return (
    <Navbar>
      <Button icon="chevron_left" onClick={prevDay} />
      <Button icon="chevron_right" onClick={nextDay} />
    </Navbar>
  )
}

export default RundownNav
