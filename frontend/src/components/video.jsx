import { useState, useRef, useEffect, useCallback } from 'react'
import { Spacer } from './layout'
import { Button } from './button'
import { InputTimecode } from './input'
import styled from 'styled-components'

const VideoPlayerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

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

const Video = ({ src, style, showMarks, marks = {}, setMarks = () => {} }) => {
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

  const onMarkIn = useCallback(() => {
    if (!videoRef.current) return
    const value = videoRef.current.currentTime
    console.log("mark in", value)
    setMarks(marks => ({ ...marks, mark_in: value }))
  }, [videoRef.current?.currentTime, setMarks])


  const onMarkOut = useCallback(() => {
    if (!videoRef.current) return
    const value = videoRef.current.currentTime
    console.log("mark out", value)
    setMarks(marks => ({ ...marks, mark_out: value }))
  }, [videoRef.current?.currentTime, setMarks])


  const frameStep = useCallback((frames) => {
    if (!videoRef.current.paused) videoRef.current.pause()
    videoRef.current.currentTime += frames / frameRate
  }, [videoRef.current?.currentTime, frameRate])


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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'i' || event.key === 'e') {
        event.preventDefault()
        onMarkIn()
      }
      else if (event.key === 'o' || event.key === 'r') {
        event.preventDefault()
        onMarkOut()
      }
      else if (event.key === 'j' || event.key === '1') {
        event.preventDefault()
        frameStep(-5)
      }
      else if (event.key === 'l' || event.key === '2') {
        event.preventDefault()
        frameStep(5)
      }
      else if (event.key === '3' || event.key === 'ArrowLeft') {
        event.preventDefault()
        frameStep(-1)
      }
      else if (event.key === '4' || event.key === 'ArrowRight') {
        event.preventDefault()
        frameStep(1)
      }
      else if (event.key === 'k' || event.key === ' ') {
        event.preventDefault()
        onPlay()
      }
      // Todo: clear marks, go to in, go to out
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])


  return (
    <VideoPlayerContainer style={style}>
      {showMarks && (
        <PlayoutControls>
          <InputTimecode
            title="Selection start"
            value={marks.mark_in}
            onChange={onMarkIn}
          />
          <Spacer />
          <InputTimecode
            title="Selection end"
            value={marks.mark_out}
            onChange={onMarkOut}
          />
        </PlayoutControls>
      )}

      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <video
          src={src}
          ref={videoRef}
          controls={false}
          onDurationChange={() => setVideoDuration(videoRef.current.duration)}
          onTimeUpdate={() => setVideoPosition(videoRef.current.currentTime)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      <PlayoutControls>
        <InputTimecode
          title="Current position"
          value={(trackbarPosition * (videoDuration || 0)) / 1000}
          onChange={(value) => {
            console.log('Seeking to', value)
            videoRef.current.currentTime = value
          }}
        />
        <Trackbar value={trackbarPosition} onInput={onSeek} />
        <InputTimecode value={videoDuration} readOnly={true} title="Duration" />
      </PlayoutControls>

      <PlayoutControls>
        {showMarks && (
          <>
            <Button
              icon="line_start_diamond"
              title="Mark in"
              onClick={() => onMarkIn(videoRef.current.currentTime)}
            />
            <Button
              icon="first_page"
              title="Go to mark in"
              onClick={() =>
                (videoRef.current.currentTime = marks.mark_in || 0)
              }
            />
          </>
        )}
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
        {showMarks && (
          <>
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
          </>
        )}
      </PlayoutControls>
    </VideoPlayerContainer>
  )
}

export default Video
