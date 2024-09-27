import { NavLink } from 'react-router-dom'
import { Navbar, InputText, Button, Spacer } from '/src/components'

const SchedulerNav = ({ startTime, setStartTime }) => {
  const prevWeek = () => {
    console.log('prevWeek')
    setStartTime(new Date(startTime.getTime() - 7 * 24 * 60 * 60 * 1000))
  }

  const nextWeek = () => {
    console.log('nextWeek')
    setStartTime(new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000))
  }

  return (
    <Navbar>
      <Button icon="chevron_left" onClick={prevWeek} />
      <Button icon="chevron_right" onClick={nextWeek} />
    </Navbar>
  )
}

export default SchedulerNav
