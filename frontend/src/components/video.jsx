import { useState, useRef, useEffect } from 'react'
import { Spacer } from './layout'
import { Button } from './button'
import { InputTimecode } from './input'
import styled from 'styled-components'

const VideoPlayerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px;

  video {
    outline: 1px solid var(--color-surface-05);
    width: 100%;
    aspect-ratio: 16/9;
  }
`

const Trackbar = styled.input`
  flex-grow: 1;
  appearance: none;
  height: var(--input-height);
  background-color: var(--color-surface-04);
  outline: none;
  padding: 0;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 5px;
    height: 25px;
    background-color: #d4d4d4;
    cursor: pointer;
  }
`
Trackbar.defaultProps = {
  type: 'range',
  min: '0',
  max: '1000',
}

const PlayoutControls = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  justify-content: center;
`

const Video = ({ src, style, marks, setMarks }) => {
  const videoRef = useRef(null)

  const [videoPosition, setVideoPosition] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [trackbarPosition, setTrackbarPosition] = useState(0)

  const frameRate = 25

  useEffect(() => {
    setVideoPosition(0)
    setVideoDuration(0)
  }, [src])

  const onPlay = () => {
    if (!videoRef.current.paused) videoRef.current.pause()
    else videoRef.current.play()
  }

  const onSeek = (event) => {
    if (!videoRef.current.paused) videoRef.current.pause()
    setTrackbarPosition(event.target.value)
    videoRef.current.currentTime = (event.target.value * videoDuration) / 1000
  }

  const onMarkIn = (value) => {
    setMarks({ ...marks, mark_in: value })
  }

  const onMarkOut = (value) => {
    setMarks({ ...marks, mark_out: value })
  }

  const frameStep = (frames) => {
    if (!videoRef.current.paused) videoRef.current.pause()
    videoRef.current.currentTime += frames / frameRate
  }

  useEffect(() => {
    if (!(videoPosition && videoDuration)) {
      setTrackbarPosition(0)
      return
    }
    setTrackbarPosition((videoPosition / videoDuration) * 1000)
  }, [videoPosition, videoDuration])

  let playButtonIcon = 'play_arrow'
  if (videoRef.current) {
    if (videoRef.current.paused) playButtonIcon = 'play_arrow'
    else playButtonIcon = 'pause'
  }

  return (
    <VideoPlayerContainer style={style}>
      <PlayoutControls>
        <InputTimecode
          title="Mark in"
          value={marks.mark_in}
          onChange={onMarkIn}
        />
        <Spacer />
        <InputTimecode
          title="Mark out"
          value={marks.mark_out}
          onChange={onMarkOut}
        />
      </PlayoutControls>

      <div style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <video
          src={src}
          ref={videoRef}
          controls={false}
          onDurationChange={() => setVideoDuration(videoRef.current.duration)}
          onTimeUpdate={() => setVideoPosition(videoRef.current.currentTime)}
        />
      </div>

      <PlayoutControls>
        <InputTimecode
          value={(trackbarPosition * (videoDuration || 0)) / 1000}
          onChange={(value) => {
            console.log('Seeking to', value)
            videoRef.current.currentTime = value
          }}
        />
        <Trackbar value={trackbarPosition} onInput={onSeek} />
        <InputTimecode value={videoDuration} readOnly={true} />
      </PlayoutControls>

      <PlayoutControls>
        <Button
          icon="line_start_diamond"
          title="Mark in"
          onClick={() => onMarkIn(videoRef.current.currentTime)}
        />
        <Button
          icon="first_page"
          title="Go to mark in"
          onClick={() => (videoRef.current.currentTime = marks.mark_in || 0)}
        />
        <Button
          icon="keyboard_double_arrow_left"
          onClick={() => frameStep(-5)}
        />
        <Button icon="chevron_left" onClick={() => frameStep(-1)} />
        <Button icon={playButtonIcon} title="Play/Pause" onClick={onPlay} />
        <Button icon="chevron_right" onClick={() => frameStep(1)} />
        <Button
          icon="keyboard_double_arrow_right"
          onClick={() => frameStep(5)}
        />
        <Button
          icon="last_page"
          title="Go to mark out"
          onClick={() =>
            (videoRef.current.currentTime =
              marks.mark_out || videoRef.current.duration)
          }
        />
        <Button
          icon="line_end_diamond"
          title="Mark out"
          onClick={() => onMarkOut(videoRef.current.currentTime)}
        />
      </PlayoutControls>
    </VideoPlayerContainer>
  )
}

export default Video
