import { Button, ErrorBanner, InputTimecode, Navbar, Section } from '@components';
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

import { useAudioContext } from './AudioContext';
import ChannelSelect from './ChannelSelect';
import Trackbar from './Trackbar';
import { VideoPlayerProps } from './types';
import VideoOverlay from './VideoOverlay';
import VideoPlayerControls from './VideoPlayerControls';
import VUMeter from './VUMeter';

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

const time2frames = (time: number, frameRate: number) => Math.round(time * frameRate);
const frames2time = (frames: number, frameRate: number) => frames / frameRate;

const DEFAULT_VIDEO_DIMENSIONS = {
  width: 600,
  height: 400,
};

const VideoPlayerBody: React.FC<VideoPlayerProps> = (props) => {
  const { audioContext, videoRef, gainNodes, numChannels } = useAudioContext();

  const [posFrames, setPosFrames] = useState(0);
  const [durFrames, setDurFrames] = useState(0);
  const [markIn, setMarkIn] = useState<number | null | undefined>(props.markIn);
  const [markOut, setMarkOut] = useState<number | null | undefined>(props.markOut);
  const [isPlaying, setIsPlaying] = useState(false);

  const isPlayingRef = useRef(isPlaying);
  const durFramesRef = useRef(durFrames);
  const markInRef = useRef(markIn);
  const markOutRef = useRef(markOut);

  const [loop, setLoop] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState(DEFAULT_VIDEO_DIMENSIONS);
  const [showOverlay, setShowOverlay] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<
    Array<{ start: number; end: number }>
  >([]);

  useEffect(() => {
    if (!props.setPosition) return;
    props.setPosition(frames2time(posFrames, props.frameRate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posFrames, props.frameRate, props.setPosition]);

  useEffect(() => {
    durFramesRef.current = durFrames;
  }, [durFrames]);

  useEffect(() => {
    if (!props.src) {
      if (videoRef.current) videoRef.current.src = '';
      setPosFrames(0);
      setDurFrames(0);
      setMarkIn(null);
      setMarkOut(null);
      setIsPlaying(false);
      return;
    }
  }, [props.src, videoRef]);

  // Propagating markIn and markOut to parent component

  useEffect(() => {
    if (props.setMarkIn) {
      props.setMarkIn(markIn ?? null);
      markInRef.current = markIn;
    }
    if (props.setMarkOut) {
      props.setMarkOut(markOut ?? null);
      markOutRef.current = markOut;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markIn, markOut, props.setMarkIn, props.setMarkOut]);

  useEffect(() => {
    if (props.markIn !== undefined) {
      setMarkIn(props.markIn);
    }
  }, [props.markIn]);

  useEffect(() => {
    if (props.markOut !== undefined) {
      setMarkOut(props.markOut);
    }
  }, [props.markOut]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Video dimensions

  useEffect(() => {
    if (!videoRef.current) return;

    const updateVideoDimensions = () => {
      if (!videoRef.current) return;
      const width = videoRef.current.clientWidth;
      const height = videoRef.current.clientHeight;
      setVideoDimensions({ width, height });
    };

    const parentElement = videoRef.current;
    const resizeObserver = new ResizeObserver(updateVideoDimensions);
    resizeObserver.observe(parentElement);

    return () => {
      resizeObserver.unobserve(parentElement);
    };
  }, [videoRef]);

  // Position

  const updatePos = () => {
    const video = videoRef.current;
    if (!video) return;
    const atFrame = time2frames(video.currentTime, props.frameRate);
    setPosFrames(atFrame);
    if (!isPlayingRef.current) return;
    if (!loop) return;

    const markOutFrame =
      time2frames(markOutRef.current ?? 0, props.frameRate) || durFramesRef.current - 1;

    if (atFrame >= markOutFrame && atFrame < markOutFrame + 4) {
      video.currentTime = markInRef.current ?? 0;
      video.play().catch(console.error);
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    let timeoutId: number;

    const updatePosMon = () => {
      if (!videoRef.current) return;
      if (isPlayingRef.current) {
        updatePos();
        timeoutId = setTimeout(() => {
          animationFrameId = requestAnimationFrame(updatePosMon);
        }, 40);
      } else {
        updatePos();
      }
    };

    updatePosMon();

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const seekToFrame = (frame: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const correctedFrame = Math.max(0, Math.min(frame, durFramesRef.current - 1));
    const newTime = frames2time(correctedFrame, props.frameRate);
    videoElement.currentTime = newTime;
  };

  const onScrubFinished = (atTime: number) => {
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
    if (!videoRef.current) return;
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

  const handleProgress = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    const buffered = video.buffered;
    if (!buffered.length) return;
    const ranges: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < buffered.length; i++) {
      const r = { start: buffered.start(i), end: buffered.end(i) };
      ranges.push(r);
    }
    setBufferedRanges(ranges);
  };

  const onPlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(console.error);
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
          onChange={(v) => {
            seekToFrame(v!);
          }}
        />
        <ChannelSelect gainNodes={gainNodes} />
        <div style={{ flex: 1 }} />
        <Button
          icon="loop"
          tooltip={loop ? 'Disable loop' : 'Enable loop'}
          onClick={() => {
            setLoop(!loop);
          }}
          active={loop}
        />
        <Button
          icon="crop_free"
          tooltip={showOverlay ? 'Hide guides' : 'Show guides'}
          onClick={() => {
            setShowOverlay(!showOverlay);
          }}
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
              onLoadedData={handleLoad}
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
            <ErrorBanner
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              {props.warning}
            </ErrorBanner>
          </VideoContainer>
        </VideoSpace>
        <VUMeter gainNodes={rightNodes} audioContext={audioContext} />
      </Section>

      <Trackbar
        duration={frames2time(durFrames, props.frameRate)}
        frameRate={props.frameRate}
        isPlaying={isPlaying}
        currentTime={frames2time(posFrames, props.frameRate)}
        onScrub={(t) => {
          seekToFrame(time2frames(t, props.frameRate));
        }}
        onScrubFinished={onScrubFinished}
        markIn={markIn ?? undefined}
        markOut={markOut ?? undefined}
        bufferedRanges={bufferedRanges}
        marks={props.marks}
      />

      <VideoPlayerControls
        frameRate={props.frameRate}
        markIn={time2frames(markIn ?? 0, props.frameRate)}
        setMarkIn={(v) => {
          setMarkIn(v === null ? null : frames2time(v, props.frameRate));
        }}
        markOut={time2frames(markOut ?? 0, props.frameRate)}
        setMarkOut={(v) => {
          setMarkOut(v === null ? null : frames2time(v, props.frameRate));
        }}
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
