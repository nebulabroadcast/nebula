import { useState, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import nebula from '/src/nebula'
import { createTitle } from './utils'
import { setPageTitle } from '/src/actions'

import { Navbar, Button, Spacer } from '/src/components'
import DateNav from '/src/containers/DateNav'
import DraggableIcon from '/src/containers/DraggableIcon'

import ApplySchedulingTemplate from './ApplySchedulingTemplate'

const dragIcons = [
  {
    name: 'empty_event',
    tooltip: 'Empty event',
    icon: 'calendar_add_on',
    data: {
      type: 'event',
      title: 'Empty event',
    },
  },
]

const SchedulerNav = ({
  setStartTime,
  loadEvents,
  deleteUnaired,
  loading,
  setLoading,
}) => {
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const dispatch = useDispatch()
  const [date, setDate] = useState()

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel)
  }, [currentChannel])

  const onDateChange = (date) => {
    const [dsHH, dsMM] = channelConfig.day_start

    const newDate = new Date(date)
    const dayOfWeek = newDate.getDay()
    const diff = newDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(newDate.setDate(diff))
    weekStart.setHours(dsHH, dsMM, 0, 0)

    const pageTitle = createTitle(weekStart, channelConfig.name)
    dispatch(setPageTitle({ title: pageTitle }))
    setStartTime(weekStart)
    setDate(date)
  }

  return (
    <Navbar>
      <DateNav onChange={onDateChange} skipBy={7} />
      <Spacer />
      {dragIcons.map((icon, index) => (
        <DraggableIcon
          key={index}
          name={icon.name}
          icon={icon.icon}
          tooltip={icon.tooltip}
          data={icon.data}
        />
      ))}
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
