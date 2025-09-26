

import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

import { useAudioContext } from './AudioContext';
import ChannelSelect from './ChannelSelect';
import Trackbar from './Trackbar';
import VideoOverlay from './VideoOverlay';
import VideoPlayerControls from './VideoPlayerControls';
import VUMeter from './VUMeter';

import { Button, InputTimecode, Navbar, Section } from '/src/components';

const VideoPlayerContainer = styled.div`
  display: flex;
  flex-grow: 1;
  flex-direction: column;
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
`;

const Video = styled.video`
  height: 100%;
  width: 100%;
  object-fit: contain;
`;

const time2frames = (time, frameRate) => Math.round(time * frameRate);
const frames2time = (frames, frameRate) => frames / frameRate;
const DEFAULT_VIDEO_DIMENSIONS = {
  width: 600,
  height: 400,
};
const VideoPlayerBody = ({ ...props }) => {
  const { audioContext, videoRef, gainNodes, numChannels } = useAudioContext();

  const [posFrames, setPosFrames] = useState(0);
  const [durFrames, setDurFrames] = useState(0);
  const [markIn, setMarkIn] = useState();
  const [markOut, setMarkOut] = useState();
  const [isPlaying, setIsPlaying] = useState(false);

  const isPlayingRef = useRef(isPlaying);
  const durFramesRef = useRef(durFrames);
  const markInRef = useRef(markIn);
  const markOutRef = useRef(markOut);

  const [loop, setLoop] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState(DEFAULT_VIDEO_DIMENSIONS);
  const [showOverlay, setShowOverlay] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState([]);

  useEffect(() => {
    if (!props.setPosition) return;
    props.setPosition(frames2time(posFrames, props.frameRate));
  }, [posFrames]);

  useEffect(() => {
    durFramesRef.current = durFrames;
  }, [durFrames]);

  // Propagating markIn and markOut to parent component

  useEffect(() => {
    if (props.setMarkIn) {
      props.setMarkIn(markIn);
      markInRef.current = markIn;
    }
    if (props.setMarkOut) {
      props.setMarkOut(markOut);
      markOutRef.current = markOut;
    }
  }, [markIn, markOut]);

  useEffect(() => {
    if (props.markIn || null !== markIn) {
      setMarkIn(props.markIn);
      if (
        !isPlaying &&
        videoRef.current &&
        props.markIn !== undefined &&
        posFrames !== time2frames(props.markIn, props.frameRate)
      ) {
        seekToFrame(time2frames(props.markIn, props.frameRate));
      }
    }
  }, [props.markIn]);

  useEffect(() => {
    if (props.markOut || null !== markOut) {
      setMarkOut(props.markOut);
    }
  }, [props.markOut]);

  useEffect(() => {
    if (isPlaying) isPlayingRef.current = true;
    else isPlayingRef.current = false;
  }, [isPlaying]);

  // Video dimensions

  useEffect(() => {
    if (!videoRef.current) return;

    const updateVideoDimensions = () => {
      const width = videoRef.current.clientWidth;
      const height = videoRef.current.clientHeight;
      setVideoDimensions({ width, height });
    };

    const parentElement = videoRef.current;
    const resizeObserver = new ResizeObserver(updateVideoDimensions);
    resizeObserver.observe(parentElement);

    return () => resizeObserver.unobserve(parentElement);
  }, [videoRef]);

  // Position

  const updatePos = () => {
    const video = videoRef.current;
    const atFrame = time2frames(video.currentTime, props.frameRate);
    setPosFrames(atFrame);
    if (!isPlayingRef.current) return;
    if (!loop) return;

    const markOutFrame =
      time2frames(markOutRef.current, props.frameRate) || durFramesRef.current - 1;

    if (atFrame >= markOutFrame && atFrame < markOutFrame + 4) {
      videoRef.current.currentTime = markInRef.current || 0;
      videoRef.current.play();
    }
  };

  const updatePosMon = () => {
    if (!videoRef.current) return;
    if (isPlayingRef.current) {
      updatePos();
      setTimeout(() => requestAnimationFrame(updatePosMon), 40);
    } else {
      updatePos();
    }
  };

  useEffect(() => {
    updatePosMon();
  }, [videoRef, isPlaying]);

  const seekToFrame = (frame) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const correctedFrame = Math.max(0, Math.min(frame, durFramesRef.current - 1));
    const newTime = frames2time(correctedFrame, props.frameRate);
    videoElement.currentTime = newTime;
  };

  const onScrubFinished = (atTime) => {
    setTimeout(() => {
      const fr = time2frames(atTime, props.frameRate);
      seekToFrame(fr);
    }, 40);
  };

  // Aux

  const handleLoad = () => {
    setIsPlaying(false);
    setPosFrames(0);
    setBufferedRanges([]);
  };

  const handleLoadedMetadata = () => {
    setDurFrames(time2frames(videoRef.current.duration, props.frameRate));
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
    if (videoRef.current?.paused) {
      setIsPlaying(false);
      setTimeout(() => {
        seekToFrame(posFrames + 1);
      }, 40);
    }
  };

  const handleEnded = () => {
    // unused
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
          value={posFrames}
          mode="frames"
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
          value={durFrames}
          mode="frames"
          fps={props.frameRate}
          readOnly={true}
          tooltip="Asset duration"
        />
      </Navbar>

      <Section className="row grow">
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
              disablePictureInPicture={true}
              disableRemotePlayback={true}
              onTimeUpdate={updatePos}
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
      </Section>

      <Trackbar
        duration={frames2time(durFrames, props.frameRate)}
        frameRate={props.frameRate}
        isPlaying={isPlaying}
        currentTime={frames2time(posFrames, props.frameRate)}
        onScrub={(t) => seekToFrame(time2frames(t, props.frameRate))}
        onScrubFinished={onScrubFinished}
        markIn={markIn}
        markOut={markOut}
        bufferedRanges={bufferedRanges}
        marks={props.marks}
      />

      <VideoPlayerControls
        frameRate={props.frameRate}
        markIn={time2frames(markIn, props.frameRate)}
        setMarkIn={(v) => setMarkIn(frames2time(v, props.frameRate))}
        markOut={time2frames(markOut, props.frameRate)}
        setMarkOut={(v) => setMarkOut(frames2time(v, props.frameRate))}
        seekToFrame={seekToFrame}
        currentFrame={posFrames}
        duration={durFrames}
        onPlayPause={onPlayPause}
        isPlaying={isPlaying}
      />
    </VideoPlayerContainer>
  );
};

export { VideoPlayerBody };
