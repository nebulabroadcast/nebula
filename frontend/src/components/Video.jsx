import { useState, useRef, useEffect, useCallback } from 'react'
import { Spacer } from './Layout'
import Button from './Button'
import InputTimecode from './InputTimecode'
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
  padding: 0;
  margin: 0;
  outline: 1px solid var(--color-surface-04);
  border-radius: 4px;

  &::-webkit-slider-thumb {
    padding: 0;
    margin: 0;
    appearance: none;
    width: 4px;
    height: 25px;
    background-color: #d4d4d4;
    cursor: pointer;
  }

  &:before {
    content: '';
    position: absolute;
    display: ${(props) => (props.posterFrame ? 'block' : 'none')};
    height: 4px;
    bottom: 0;
    width: 2px;
    border: 0;
    left: ${(props) => props.posterFrame}%;
    background: var(--color-yellow);
  }

  /* highlight the specified range using the highlightStart and highlightEnd props */
  background: linear-gradient(
    to right,
    var(--color-surface-02),
    var(--color-surface-02) ${(props) => props.highlightStart}%,
    var(--color-surface-04) ${(props) => props.highlightStart}%,
    var(--color-surface-04) ${(props) => props.highlightEnd}%,
    var(--color-surface-02) ${(props) => props.highlightEnd}%,
    var(--color-surface-02)
  );
`
Trackbar.defaultProps = {
  tabIndex: -1,
  type: 'range',
  min: '0',
  max: '1000',
  highlightStart: 0,
  highlightEnd: 100,
}

const PlayoutControls = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  justify-content: center;
`

const Video = ({
  src,
  style,
  showMarks,
  position,
  setPosition,
  marks = {},
  setMarks = () => {},
}) => {
  const videoRef = useRef(null)
  const sliderRef = useRef(null)
  const playButtonRef = useRef(null)

  const [videoPosition, setVideoPosition] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [trackbarPosition, setTrackbarPosition] = useState(0)
  //const [maximize, setMaximize] = useState(false)

  const frameRate = 25

  useEffect(() => {
    setVideoPosition(0)
    setVideoDuration(0)
  }, [src])

  useEffect(() => {
    if (position !== undefined) {
      videoRef.current.currentTime = position
    }
  }, [position])

  useEffect(() => {
    if (!setPosition) return
    setPosition(videoPosition)
  }, [videoPosition])

  const handleFinishSlider = useCallback(() => {
    if (playButtonRef.current) {
      playButtonRef.current.focus()
    }
  }, [playButtonRef.current])

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
    setMarks((marks) => ({ ...marks, mark_in: value }))
  }, [videoRef.current?.currentTime, setMarks])

  const onMarkOut = useCallback(() => {
    if (!videoRef.current) return
    const value = videoRef.current.currentTime
    setMarks((marks) => ({ ...marks, mark_out: value }))
  }, [videoRef.current?.currentTime, setMarks])

  const onClearIn = useCallback(() => {
    setMarks((marks) => ({ ...marks, mark_in: null }))
  }, [setMarks])

  const onClearOut = useCallback(() => {
    setMarks((marks) => ({ ...marks, mark_out: null }))
  }, [setMarks])

  const onClearAll = useCallback(() => {
    setMarks(() => ({ mark_in: null, mark_out: null }))
  }, [setMarks])

  const onGoToIn = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.currentTime = marks.mark_in || 0
  }, [videoRef.current?.currentTime, marks.mark_in])

  const onGoToOut = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.currentTime = marks.mark_out || videoRef.current.duration
  }, [
    videoRef.current?.currentTime,
    marks.mark_out,
    videoRef.current?.duration,
  ])

  const onGoToStart = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.currentTime = 0
  }, [videoRef.current?.currentTime])

  const onGoToEnd = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.currentTime = videoRef.current.duration
  }, [videoRef.current?.currentTime, videoRef.current?.duration])

  const frameStep = useCallback(
    (frames) => {
      if (!videoRef.current.paused) videoRef.current.pause()
      videoRef.current.currentTime += frames / frameRate
    },
    [videoRef.current?.currentTime, frameRate]
  )

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
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return
      //abort if control or alt key pressed
      if (event.ctrlKey || event.altKey) return

      if (event.key === 'i' || event.key === 'e') {
        event.preventDefault()
        onMarkIn()
      } else if (event.key === 'o' || event.key === 'r') {
        event.preventDefault()
        onMarkOut()
      } else if (event.key === 'j' || event.key === '1') {
        event.preventDefault()
        frameStep(-5)
      } else if (event.key === 'l' || event.key === '2') {
        event.preventDefault()
        frameStep(5)
      } else if (event.key === '3' || event.key === 'ArrowLeft') {
        event.preventDefault()
        frameStep(-1)
      } else if (event.key === '4' || event.key === 'ArrowRight') {
        event.preventDefault()
        frameStep(1)
      } else if (event.key === 'k' || event.key === ' ') {
        event.preventDefault()
        onPlay()
      } else if (event.key === 'q') {
        event.preventDefault()
        onGoToIn()
      } else if (event.key === 'w') {
        event.preventDefault()
        onGoToOut()
      } else if (event.key === 'a') {
        event.preventDefault()
        onGoToStart()
      } else if (event.key === 's') {
        event.preventDefault()
        onGoToEnd()
      } else if (event.key === 'd') {
        event.preventDefault()
        onClearIn()
      } else if (event.key === 'f') {
        event.preventDefault()
        onClearOut()
      } else if (event.key === 'g') {
        event.preventDefault()
        onClearAll()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const videoContainer = (
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
            videoRef.current.currentTime = value
          }}
        />
        <div
          style={{
            flexGrow: 1,
            position: 'relative',
            display: 'flex',
            padding: 0,
            margin: 0,
          }}
        >
          <Trackbar
            value={trackbarPosition}
            onInput={onSeek}
            highlightStart={((marks.mark_in || 0) / videoDuration) * 100}
            highlightEnd={
              ((marks.mark_out || videoDuration) / videoDuration) * 100
            }
            posterFrame={((marks.poster_frame || 0) / videoDuration) * 100}
            ref={sliderRef}
            onMouseLeave={handleFinishSlider}
            onMouseUp={handleFinishSlider}
          />
        </div>
        <InputTimecode value={videoDuration} readOnly={true} title="Duration" />
      </PlayoutControls>

      <PlayoutControls>
        {showMarks && (
          <>
            <Button
              icon="line_start_diamond"
              tooltip="Mark in"
              onClick={() => onMarkIn(videoRef.current.currentTime)}
            />
            <Button
              icon="first_page"
              tooltip="Go to mark in"
              onClick={onGoToIn}
            />
          </>
        )}
        <Button
          icon="keyboard_double_arrow_left"
          tooltip="Back 5 frames"
          onClick={() => frameStep(-5)}
        />
        <Button
          icon="chevron_left"
          tooltip="Back 1 frame"
          onClick={() => frameStep(-1)}
        />
        <Button
          icon={playButtonIcon}
          tooltip="Play/Pause"
          onClick={onPlay}
          ref={playButtonRef}
        />
        <Button
          icon="chevron_right"
          tooltip="Forward 1 frame"
          onClick={() => frameStep(1)}
        />
        <Button
          icon="keyboard_double_arrow_right"
          tooltip="Forward 5 frames"
          onClick={() => frameStep(5)}
        />
        {showMarks && (
          <>
            <Button
              icon="last_page"
              tooltip="Go to mark out"
              onClick={onGoToOut}
            />
            <Button
              icon="line_end_diamond"
              tooltip="Mark out"
              onClick={() => onMarkOut(videoRef.current.currentTime)}
            />
          </>
        )}
      </PlayoutControls>
    </VideoPlayerContainer>
  )

  //<Button icon="fullscreen" title="Fullscreen" onClick={() => setMaximize(!maximize)} />
  // if (maximize) {
  //   return (
  //     <Dialog onHide={() => setMaximize(false)} style={{height: '90%', maxHeight: '90%', width: '80%', position: 'static', overflow:'visible'}}>
  //       {videoContainer}
  //     </Dialog>
  //   )
  // }
  return videoContainer
}

export default Video
