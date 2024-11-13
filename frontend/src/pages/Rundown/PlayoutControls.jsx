import { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { Dialog, Button, Progress } from '/src/components'

const DisplayRow = styled.div`
  display: flex;
  gap: 12px;
`

const BaseDisplay = styled.div`
  background-color: var(--color-surface-01);
  padding: 4px 8px;
  font-weight: bold;
`

const DisplayTime = styled(BaseDisplay)`
  flex-basis: 150px;
  font-family: var(--font-family-mono), monospace;
`

const DisplayName = styled(BaseDisplay)`
  flex-grow: 1;
`

const ButtonRow = styled.div`
  flex-direction: row;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;

  button {
    width: 80px !important;
  }
`

const s2tc = (seconds, fps) => {
  const h = Math.floor(seconds / 3600) % 24
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * fps)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}:${f.toString().padStart(2, '0')}`
}

const PlayoutControls = ({ playoutStatus }) => {
  const position = playoutStatus?.position || 0
  const duration = playoutStatus?.duration || 0
  const currentTitle = playoutStatus?.current_title || ''
  const cuedTitle = playoutStatus?.cued_title || ''

  const [dispClk, setDispClk] = useState('--:--:--:--')
  const [dispPos, setDispPos] = useState('--:--:--:--')
  const [dispRem, setDispRem] = useState('--:--:--:--')
  const [dispDur, setDispDur] = useState('--:--:--:--')

  const statusRef = useRef(playoutStatus)

  useEffect(() => {
    const now = new Date().getTime() / 1000
    statusRef.current = { ...playoutStatus, receivedAt: now }
  }, [playoutStatus])

  const progress = (playoutStatus?.position / playoutStatus?.duration) * 100

  const onTimer = () => {
    if (!statusRef.current) return

    const now = new Date().getTime() / 1000
    const { position, duration, receivedAt } = statusRef.current
    const elapsed = now - receivedAt
    const fps = 25
    const estimatedPosition = Math.max(0, position + elapsed)

    setDispClk(s2tc(now, fps))
    setDispPos(s2tc(estimatedPosition, fps))
    setDispRem(s2tc(duration - estimatedPosition, fps))
    setDispDur(s2tc(duration, fps))
  }

  useEffect(() => {
    const timer = setInterval(onTimer, 40)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="column" style={{ gap: 8 }}>
      <DisplayRow>
        <DisplayTime>CLK: {dispClk}</DisplayTime>
        <DisplayName>CUR: {currentTitle}</DisplayName>
        <DisplayTime>REM: {dispRem}</DisplayTime>
      </DisplayRow>

      <DisplayRow>
        <DisplayTime>POS: {dispPos}</DisplayTime>
        <DisplayName>NXT: {cuedTitle}</DisplayName>
        <DisplayTime>DUR: {dispDur}</DisplayTime>
      </DisplayRow>

      <Progress value={progress} />

      <ButtonRow>
        <Button
          label="Take"
          style={{ border: '1px solid var(--color-green-muted)' }}
        />
        <Button
          label="Freeze"
          style={{ border: '1px solid var(--color-red-muted)' }}
        />
        <Button label="Retake" />
        <Button label="Abort" />
        <Button label="Loop" />
        <Button label="Cue prev" />
        <Button label="Cue next" />
      </ButtonRow>
    </section>
  )
}

export default PlayoutControls
