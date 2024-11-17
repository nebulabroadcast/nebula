import nebula from '/src/nebula'

import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
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
  user-select: none;
  user-drag: none;
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
  if (isNaN(seconds)) return '--:--:--:--'
  const h = Math.floor(seconds / 3600) % 24
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * fps)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}:${f.toString().padStart(2, '0')}`
}

const PlayoutControls = ({
  playoutStatus,
  rundownMode,
  loadRundown,
  onError,
}) => {
  const currentChannel = useSelector((state) => state.context.currentChannel)
  const currentTitle = playoutStatus?.current_title || ''
  const cuedTitle = playoutStatus?.cued_title || ''
  const [progress, setProgress] = useState(0)

  const [dispClk, setDispClk] = useState('--:--:--:--')
  const [dispPos, setDispPos] = useState('--:--:--:--')
  const [dispRem, setDispRem] = useState('--:--:--:--')
  const [dispDur, setDispDur] = useState('--:--:--:--')

  const statusRef = useRef(playoutStatus)

  useEffect(() => {
    const now = new Date().getTime() / 1000
    statusRef.current = { ...playoutStatus, receivedAt: now }

    if (playoutStatus?.duration) {
      const progress =
        ((playoutStatus?.position || 0) / playoutStatus?.duration) * 100
      setProgress(progress)
    }
  }, [playoutStatus])

  const onTimer = () => {
    if (!statusRef.current) return

    const now = new Date().getTime() / 1000
    const { position, duration, receivedAt } = statusRef.current
    const elapsed = now - receivedAt
    const fps = 25
    const estimatedPos = Math.max(0, position + elapsed)
    const estimatedRem = Math.max(0, duration - estimatedPos)

    const localNow = new Date()
    const localOffset = localNow.getTimezoneOffset() * 60

    setDispClk(s2tc(now - localOffset, fps))
    setDispPos(s2tc(estimatedPos, fps))
    setDispRem(s2tc(estimatedRem, fps))
    setDispDur(s2tc(duration, fps))
  }

  useEffect(() => {
    const timer = setInterval(onTimer, 40)
    return () => clearInterval(timer)
  }, [])

  const onCommand = (command, payload) => {
    console.log('Command', command)
    nebula
      .request('playout', {
        id_channel: currentChannel,
        action: command,
        payload,
      })
      .then(loadRundown)
      .catch(onError)
  }

  return (
    <>
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
      </section>
      {rundownMode === 'control' && (
        <section className="column" style={{ gap: 8 }}>
          <ButtonRow>
            <Button
              label="Take"
              style={{ border: '1px solid var(--color-green-muted)' }}
              onClick={() => onCommand('take')}
            />
            <Button
              label="Freeze"
              style={{ border: '1px solid var(--color-red-muted)' }}
              onClick={() => onCommand('freeze')}
            />
            <Button label="Retake" onClick={() => onCommand('retake')} />
            <Button label="Abort" onClick={() => onCommand('abort')} />
            <Button
              label="Loop"
              onClick={() => toast.error('not implemented')}
            />
            <Button
              label="Cue prev"
              onClick={() => onCommand('cue_backward')}
            />
            <Button label="Cue next" onClick={() => onCommand('cue_forward')} />
          </ButtonRow>
        </section>
      )}

      {rundownMode === 'plugins' && (
        <section className="column" style={{ gap: 8 }}>
          not implemented
        </section>
      )}
    </>
  )
}

export default PlayoutControls
