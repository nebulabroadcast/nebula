import { useEffect, useState, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { useDialog } from '/src/hooks'

import nebula from '/src/nebula'
import { Navbar, Button, Spacer, RadioButton } from '/src/components'
import { setPageTitle } from '/src/actions'

const RundownNav = ({
  startTime,
  setStartTime,
  rundownMode,
  setRundownMode,
}) => {
  const [date, setDate] = useState()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const dispatch = useDispatch()
  const showDialog = useDialog()

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel)
  }, [currentChannel])

  useEffect(() => {
    let dateParam = searchParams.get('date')
    if (date && dateParam === date) return
    if (!dateParam) dateParam = new Date().toISOString().split('T')[0]

    const [dsHH, dsMM] = channelConfig.day_start

    const newDate = new Date(dateParam)
    newDate.setHours(dsHH, dsMM, 0, 0)
    setStartTime(newDate)
    setDate(dateParam)
    const pageTitle = `${newDate.toLocaleDateString(nebula.locale, {
      month: 'long',
      weekday: 'long',
      day: 'numeric',
    })}`
    dispatch(setPageTitle({ title: pageTitle }))
  }, [searchParams, currentChannel])

  useEffect(() => {
    if (date && date !== searchParams.get('date')) {
      setSearchParams((o) => {
        o.set('date', date)
        return o
      })
    }
  }, [date])

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

  const prevDay = () => dateStep(-1)
  const nextDay = () => dateStep(1)

  const pickDate = async () => {
    try {
      const newDate = await showDialog('date', 'Pick date', { value: date })
      setSearchParams((o) => {
        o.set('date', newDate)
        return o
      })
    } catch {}
  }

  return (
    <Navbar>
      <Button icon="chevron_left" onClick={prevDay} tooltip="Previous day" />
      <Button icon="calendar_today" onClick={pickDate} tooltip="Pick date" />
      <Button icon="chevron_right" onClick={nextDay} tooltip="Next day" />

      <Spacer />
      <RadioButton
        options={[
          { label: 'Edit', value: 'edit' },
          { label: 'Control', value: 'control' },
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
