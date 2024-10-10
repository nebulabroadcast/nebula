import { useState, useEffect, useMemo } from 'react'

import RundownNav from './RundownNav'

const Rundown = () => {
  const [startTime, setStartTime] = useState(null)

  return (
    <main className="column">
      <RundownNav startTime={startTime} setStartTime={setStartTime} />
      <section className="grow nopad">{startTime?.toISOString()}</section>
    </main>
  )
}

export default Rundown
