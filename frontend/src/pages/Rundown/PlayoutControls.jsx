import { Dialog, Button, Progress } from '/src/components'

const PlayoutControls = ({ playoutStatus }) => {
  const position = playoutStatus?.position || 0
  const duration = playoutStatus?.duration || 0
  const currentTitle = playoutStatus?.current_title || ''
  const cuedTitle = playoutStatus?.cued_title || ''

  const progress = (playoutStatus?.position / playoutStatus?.duration) * 100

  return (
    <div className="playout-controls">
      {currentTitle}
      {cuedTitle}
      <Progress value={progress} />
    </div>
  )
}

export default PlayoutControls
