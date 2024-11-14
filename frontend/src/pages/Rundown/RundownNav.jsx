import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useSearchParams } from 'react-router-dom'

import { Navbar, Button, Spacer, RadioButton } from '/src/components'
import { setPageTitle } from '/src/actions'

const DAY = 24 * 60 * 60 * 1000

const RundownNav = ({
  startTime,
  setStartTime,
  rundownMode,
  setRundownMode,
}) => {
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
      <Button icon="chevron_left" onClick={prevDay} tooltip="Previous day" />
      <Button icon="chevron_right" onClick={nextDay} tooltip="Next day" />

      <Spacer />
      <RadioButton
        options={[
          { label: 'Edit', value: 'edit' },
          { label: 'Playout', value: 'playout' },
          { label: 'Plugins', value: 'plugins' },
        ]}
        value={rundownMode}
        onChange={setRundownMode}
      />
      <Spacer />
    </Navbar>
  )
}

export default RundownNav
