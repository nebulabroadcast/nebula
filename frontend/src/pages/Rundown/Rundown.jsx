import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import nebula from '/src/nebula'

import RundownNav from './RundownNav'
import RundownTable from './RundownTable'

const Rundown = () => {
  const [startTime, setStartTime] = useState(null)
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const [rundown, setRundown] = useState(null)

  const onResponse = (response) => {
    setRundown(response.data.rows)
  }

  const onError = (error) => {
    console.log(error.response)
  }

  useEffect(() => {
    if (!startTime) return
    const requestParams = {
      date: startTime.toISOString().split('T')[0],
      id_channel: currentChannel,
    }
    nebula.request('rundown', requestParams).then(onResponse).catch(onError)
  }, [startTime, currentChannel])

  return (
    <main className="column">
      <RundownNav startTime={startTime} setStartTime={setStartTime} />
      <RundownTable data={rundown} />
    </main>
  )
}

export default Rundown
