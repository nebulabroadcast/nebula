import { useState, useEffect, useMemo } from 'react'
import nebula from '/src/nebula'

import RundownNav from './RundownNav'
import RundownTable from './RundownTable'

const Rundown = () => {
  const [startTime, setStartTime] = useState(null)
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
      id_channel: 1,
    }
    nebula.request('rundown', requestParams).then(onResponse).catch(onError)
  }, [startTime])

  return (
    <main className="column">
      <RundownNav startTime={startTime} setStartTime={setStartTime} />
      <section className="grow nopad">
        <RundownTable data={rundown} />
      </section>
    </main>
  )
}

export default Rundown
