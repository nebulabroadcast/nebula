import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import styled from 'styled-components'
import clsx from 'clsx'

import nebula from '/src/nebula'
import { Button, Progress } from '/src/components'

const ControlsSection = styled.section`
  flex-direction: column;
  gap: 8px;

  &.warn {
    .progress {
      background-color: var(--color-red);
    }
  }
`

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
  flex-basis: 140px;
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

  const [progress, setProgress] = useState(0)
  const [progressClassName, setProgressClassName] = useState(null)

  const statusRef = useRef(playoutStatus)

  const dispClkRef = useRef()
  const dispPosRef = useRef()
  const dispRemRef = useRef()
  const dispDurRef = useRef()
  const dispCurRef = useRef()
  const dispNxtRef = useRef()

  useEffect(() => {
    const now = new Date().getTime() / 1000
    statusRef.current = { ...playoutStatus, receivedAt: now }

    if (playoutStatus?.duration) {
      const progress =
        ((playoutStatus?.position || 0) / playoutStatus?.duration) * 100
      setProgress(progress)

      if (playoutStatus.duration - playoutStatus.position < 10) {
        setProgressClassName('warn')
      } else {
        setProgressClassName(null)
      }
    }
  }, [playoutStatus])

  const onTimer = () => {
    if (!statusRef.current) return

    const now = new Date().getTime() / 1000
    const { position, duration, receivedAt, current_title, cued_title } =
      statusRef.current
    const elapsed = now - receivedAt
    const fps = 25
    const estimatedPos = Math.max(0, position + elapsed)
    const estimatedRem = Math.max(0, duration - estimatedPos)

    const localNow = new Date()
    const localOffset = localNow.getTimezoneOffset() * 60

    const dispClk = 'CLK: ' + s2tc(now - localOffset, fps)
    const dispPos = 'POS: ' + s2tc(estimatedPos, fps)
    const dispRem = 'REM: ' + s2tc(estimatedRem, fps)
    const dispDur = 'DUR: ' + s2tc(Math.max(0, duration), fps)
    const dispCur = 'CUR: ' + (current_title || '')
    const dispNxt = 'NXT: ' + (cued_title || '')

    dispClkRef.current.innerText = dispClk
    dispPosRef.current.innerText = dispPos
    dispRemRef.current.innerText = dispRem
    dispDurRef.current.innerText = dispDur
    dispCurRef.current.innerText = dispCur
    dispNxtRef.current.innerText = dispNxt
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
      <ControlsSection className={clsx(progressClassName)}>
        <DisplayRow>
          <DisplayTime ref={dispClkRef}></DisplayTime>
          <DisplayName ref={dispCurRef}></DisplayName>
          <DisplayTime ref={dispRemRef}></DisplayTime>
        </DisplayRow>

        <DisplayRow>
          <DisplayTime ref={dispPosRef}></DisplayTime>
          <DisplayName ref={dispNxtRef}></DisplayName>
          <DisplayTime ref={dispDurRef}></DisplayTime>
        </DisplayRow>

        <Progress value={progress} />
      </ControlsSection>
      {rundownMode === 'control' && (
        <ControlsSection>
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
        </ControlsSection>
      )}

      {rundownMode === 'plugins' && (
        <ControlsSection>not implemented</ControlsSection>
      )}
    </>
  )
}

export default PlayoutControls
