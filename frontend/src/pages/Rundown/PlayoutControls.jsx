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

const PlayoutControls = ({ playoutStatus }) => {
  const position = playoutStatus?.position || 0
  const duration = playoutStatus?.duration || 0
  const currentTitle = playoutStatus?.current_title || ''
  const cuedTitle = playoutStatus?.cued_title || ''

  const progress = (playoutStatus?.position / playoutStatus?.duration) * 100

  return (
    <section className="column" style={{ gap: 8 }}>
      <DisplayRow>
        <DisplayTime>CLK:</DisplayTime>
        <DisplayName>CUR: {currentTitle}</DisplayName>
        <DisplayTime>REM:</DisplayTime>
      </DisplayRow>

      <DisplayRow>
        <DisplayTime>POS:</DisplayTime>
        <DisplayName>NXT: {cuedTitle}</DisplayName>
        <DisplayTime>DUR:</DisplayTime>
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
