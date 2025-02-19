import styled from 'styled-components';

import { useAudioContext } from './AudioContext';
import { useState, useEffect, useRef } from 'react';

import VUMeter from './VUMeter';
import ChannelSelect from './ChannelSelect';
import Trackbar from './Trackbar';
import VideoOverlay from './VideoOverlay';
import VideoPlayerControls from './VideoPlayerControls';

import { Button, InputTimecode, Navbar } from '/src/components';

const VideoPlayerContainer = styled.div`
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
`;

const VideoSpace = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const VideoContainer = styled.div`
  position: relative;
  height: 100%;
  padding: 0 8px;
`;

const Video = styled.video`
  height: 100%;
  width: 100%;
  object-fit: contain;
`;

const VideoPlayerBody = ({ ...props }) => {
  const { audioContext, videoRef, gainNodes, numChannels } = useAudioContext();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({
    width: 600,
    height: 400,
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState([]);

  const [markIn, setMarkIn] = useState();
  const [markOut, setMarkOut] = useState();

  const desiredFrame = useRef(0);
  const frameLength = 1 / props.frameRate;

  useEffect(() => {
    if (props.setPosition) {
      props.setPosition(currentTime);
    }
  }, [currentTime]);

  // Propagating markIn and markOut to parent component

  useEffect(() => {
    if (props.setMarkIn) {
      props.setMarkIn(markIn);
    }
    if (props.setMarkOut) {
      props.setMarkOut(markOut);
    }
  }, [markIn, markOut]);

  useEffect(() => {
    if (props.markIn || null !== markIn) {
      setMarkIn(props.markIn);
      if (
        !isPlaying &&
        videoRef.current &&
        props.markIn !== undefined &&
        currentTime !== props.markOut
      ) {
        seekToTime(props.markIn);
      }
    }
    if (props.markOut || null !== markOut) {
      setMarkOut(props.markOut);
    }
  }, [props.markIn, props.markOut]);

  // Update video dimensions on resize

  useEffect(() => {
    // we need this to scale the video overlay
    // exactly like the video element

    if (!videoRef.current) return;

    const updateVideoDimensions = () => {
      const width = videoRef.current.clientWidth;
      const height = videoRef.current.clientHeight;
      console.log('Video dimensions', width, height);
      setVideoDimensions({ width, height });
    };

    const parentElement = videoRef.current;
    const resizeObserver = new ResizeObserver(updateVideoDimensions);
    resizeObserver.observe(parentElement);

    return () => resizeObserver.unobserve(parentElement);
  }, [videoRef]);

  const normalizeTime = (time) => {
    const currentFrame = Math.round(time * props.frameRate);
    return currentFrame / props.frameRate;
  };

  const setNormalizedTime = () => {
    if (videoRef.current.currentTime === currentTime) return;

    const actualDuration = videoRef.current.duration;
    if (actualDuration !== duration) {
      setDuration(actualDuration);
    }
    const boundTime = Math.min(
      videoRef.current?.currentTime || 0,
      actualDuration - frameLength
    );
    const currentFrame = Math.floor(boundTime * props.frameRate);
    const correctTime = currentFrame / props.frameRate;

    setCurrentTime(correctTime);
    desiredFrame.current = currentFrame;
  };

  useEffect(() => {
    if (!videoRef.current) return;
    const updateTime = () => {
      if (isPlaying) {
        setNormalizedTime();
        setTimeout(() => requestAnimationFrame(updateTime), 40);
      } else {
        setNormalizedTime();
      }
    };
    updateTime();
  }, [videoRef, isPlaying, duration]);

  const seekToTime = (newTime) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const newNormalizedTime = normalizeTime(newTime);
    if (videoElement.currentTime === newNormalizedTime) return;
    videoElement.currentTime = newNormalizedTime;
    desiredFrame.current = Math.floor(newTime * props.frameRate);
    setCurrentTime(newTime);
  };

  const handleLoad = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setBufferedRanges([]);
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
    const width = videoRef.current.clientWidth;
    const height = videoRef.current.clientHeight;
    setVideoDimensions({ width, height });
    setIsPlaying(!videoRef.current.paused);
    setBufferedRanges([]);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    //seekToTime(desiredFrame.current / props.frameRate);
    setTimeout(() => {
      if (videoRef.current?.paused) {
        //seekToTime(desiredFrame.current / props.frameRate);
        seekToTime(currentTime);
        setIsPlaying(false);
      }
    }, 20);
  };

  const handleEnded = () => {
    if (!isPlaying) {
      return;
    }
    if (loop) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    } else {
      setIsPlaying(false);
    }
  };

  const handleProgress = (e) => {
    // create a list of buffered time ranges
    const buffered = e.target.buffered;
    if (!buffered.length) return;
    const bufferedRanges = [];
    for (var i = 0; i < buffered.length; i++) {
      const r = { start: buffered.start(i), end: buffered.end(i) };
      bufferedRanges.push(r);
    }
    setBufferedRanges(bufferedRanges);
  };

  const onPlayPause = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  // half of the nodes will be on the left, the other half on the right
  const leftNodes = (gainNodes || []).slice(0, numChannels / 2);
  const rightNodes = (gainNodes || []).slice(numChannels / 2);

  return (
    <VideoPlayerContainer style={{ display: videoRef.current ? 'flex' : 'none' }}>
      <Navbar>
        <InputTimecode
          value={currentTime}
          tooltip="Current position"
          fps={props.frameRate}
        />
        <ChannelSelect gainNodes={gainNodes} />
        <div style={{ flex: 1 }} />
        <Button
          icon="loop"
          tooltip={loop ? 'Disable loop' : 'Enable loop'}
          onClick={() => setLoop(!loop)}
          active={loop}
        />
        <Button
          icon="crop_free"
          tooltip={showOverlay ? 'Hide guides' : 'Show guides'}
          onClick={() => setShowOverlay(!showOverlay)}
          active={showOverlay}
        />
        <InputTimecode
          value={duration}
          fps={props.frameRate}
          readOnly={true}
          tooltip="Asset duration"
        />
      </Navbar>

      <section className="row grow">
        <VUMeter gainNodes={leftNodes} audioContext={audioContext} />
        <VideoSpace>
          <VideoContainer>
            <Video
              ref={videoRef}
              controls={false}
              onLoad={handleLoad}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
              onTimeUpdate={setNormalizedTime}
              src={props.src}
            />
            <VideoOverlay
              videoWidth={videoDimensions.width}
              videoHeight={videoDimensions.height}
              showOverlay={showOverlay}
            />
          </VideoContainer>
        </VideoSpace>
        <VUMeter gainNodes={rightNodes} audioContext={audioContext} />
      </section>

      <Trackbar
        duration={duration}
        frameRate={props.frameRate}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onScrub={seekToTime}
        markIn={markIn}
        markOut={markOut}
        bufferedRanges={bufferedRanges}
        marks={props.marks}
      />

      <VideoPlayerControls
        markIn={markIn}
        frameRate={props.frameRate}
        setMarkIn={setMarkIn}
        markOut={markOut}
        setMarkOut={setMarkOut}
        seekToTime={seekToTime}
        currentTime={currentTime}
        onPlayPause={onPlayPause}
        duration={duration}
        isPlaying={isPlaying}
      />
    </VideoPlayerContainer>
  );
};

export { VideoPlayerBody };
