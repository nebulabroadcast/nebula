import styled from 'styled-components'

import { useAudioContext } from './AudioContext'
import { useState, useEffect } from 'react'

import VUMeter from './VUMeter'
import ChannelSelect from './ChannelSelect'
import Trackbar from './Trackbar'
import VideoOverlay from './VideoOverlay'
import VideoPlayerControls from './VideoPlayerControls'

import { Button, InputTimecode, Navbar } from '/src/components'

const VideoPlayerContainer = styled.div`
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  gap: 8px;
`

const Row = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
`

const Video = styled.video`
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: black;
`

const VideoPlayerBody = ({ ...props }) => {

  const { audioContext, videoRef, gainNodes, numChannels } = useAudioContext()
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoDimensions, setVideoDimensions] = useState({
    width: 600,
    height: 400,
  })
  const [showOverlay, setShowOverlay] = useState(false)
  const [bufferedRanges, setBufferedRanges] = useState([])

  const [markIn, setMarkIn] = useState()
  const [markOut, setMarkOut] = useState()

  

  // Propagating markIn and markOut to parent component

  useEffect(() => {
    if (props.setMarkIn) {
      props.setMarkIn(markIn)
    }
    if (props.setMarkOut) {
      props.setMarkOut(markOut)
    }
  }, [markIn, markOut])

  useEffect(() => {
    console.log('markIn', props.markIn, markIn)
    if (props.markIn || null !== markIn) {
      setMarkIn(props.markIn)
    }
    if (props.markOut || null !== markOut) {
      setMarkOut(props.markOut)
    }
  }, [props.markIn, props.markOut])

  // Update video dimensions on resize

  useEffect(() => {
    // we need this to scale the video overlay
    // exactly like the video element

    if (!videoRef.current) return

    const updateVideoDimensions = () => {
      const width = videoRef.current.clientWidth
      const height = videoRef.current.clientHeight
      setVideoDimensions({ width, height })
    }

    const parentElement = videoRef.current.parentElement
    const resizeObserver = new ResizeObserver(updateVideoDimensions)
    resizeObserver.observe(parentElement)

    return () => resizeObserver.unobserve(parentElement)
  }, [videoRef])

  useEffect(() => {
    if (!videoRef.current) return
    // TODO:
    const frameLength = 0.04
    const updateTime = () => {
      const actualDuration = videoRef.current.duration
      if (actualDuration !== duration) {
        setDuration(actualDuration)
      }
      const actualTime = Math.min(
        videoRef.current?.currentTime || 0,
        actualDuration - frameLength
      )
      if (isPlaying) {
        setCurrentTime(actualTime)
        setTimeout(() => requestAnimationFrame(updateTime), 40)
      } else {
        setCurrentTime(actualTime)
      }
    }
    updateTime()
  }, [videoRef, isPlaying, duration])

  const handleLoad = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    setBufferedRanges([])
  }

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration)
    const width = videoRef.current.clientWidth
    const height = videoRef.current.clientHeight
    setVideoDimensions({ width, height })
    setIsPlaying(!videoRef.current.paused)
    setBufferedRanges([])
  }

  const handleProgress = (e) => {
    // create a list of buffered time ranges
    const buffered = e.target.buffered
    if (!buffered.length) return
    const bufferedRanges = []
    for (var i = 0; i < buffered.length; i++) {
      const r = { start: buffered.start(i), end: buffered.end(i) }
      bufferedRanges.push(r)
    }
    setBufferedRanges(bufferedRanges)
  }

  const handleScrub = (newTime) => {
    videoRef.current.pause()
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // half of the nodes will be on the left, the other half on the right
  const leftNodes = (gainNodes || []).slice(0, numChannels / 2)
  const rightNodes = (gainNodes || []).slice(numChannels / 2)

  return (
    <VideoPlayerContainer
      style={{ display: videoRef.current ? 'flex' : 'none' }}
    >
      <Navbar>
        <InputTimecode value={currentTime} />
        <ChannelSelect gainNodes={gainNodes} />
        <div style={{ flex: 1 }} />
        <Button
          icon="pageless"
          title={showOverlay ? 'Hide guides' : 'Show guides'}
          onClick={() => setShowOverlay(!showOverlay)}
          active={showOverlay}
        />
        <InputTimecode value={duration} readOnly={true} />
      </Navbar>

      <section className="row">
        <VUMeter gainNodes={leftNodes} audioContext={audioContext} />
        <div
          style={{
            position: 'relative',
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <Video
              ref={videoRef}
              controls={false}
              onLoad={handleLoad}
              onLoadedMetadata={handleLoadedMetadata}
              onPlaying={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
              onProgress={handleProgress}
              src={props.src}
              style={{ outline: showOverlay ? '1px solid silver' : 'none' }}
            />
            <VideoOverlay
              videoWidth={videoDimensions.width}
              videoHeight={videoDimensions.height}
              showOverlay={showOverlay}
            />
          </div>
        </div>
        <VUMeter gainNodes={rightNodes} audioContext={audioContext} />
      </section>

      <Trackbar
        videoDuration={duration}
        currentTime={currentTime}
        onScrub={handleScrub}
        markIn={markIn}
        markOut={markOut}
        bufferedRanges={bufferedRanges}
      />

      <VideoPlayerControls
        markIn={markIn}
        setMarkIn={setMarkIn}
        markOut={markOut}
        setMarkOut={setMarkOut}
        isPlaying={isPlaying}
      />
    </VideoPlayerContainer>
  )
}

export { VideoPlayerBody }
