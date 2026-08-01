import {
  Button,
  ErrorBanner,
  InputTimecode,
  Loader,
  LoaderWrapper,
  Navbar,
  Section,
} from '@components';
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import styled from 'styled-components';

import ChannelSelect from './ChannelSelect';
import { PlayerEngine, type OverlayRenderer, type TimeRange } from './PlayerEngine';
import Trackbar from './Trackbar';
import { VideoPlayerProps, VideoPlayerRef } from './types';
import { useAudioGraph } from './useAudioGraph';
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

const VideoCanvas = styled.canvas`
  height: 100%;
  width: 100%;
  object-fit: contain;
`;

const time2frames = (time: number, frameRate: number) => Math.round(time * frameRate);
const frames2time = (frames: number, frameRate: number) => frames / frameRate;

// Safe area and center cross, drawn over the video frame.
// Line widths are divided by the scale, so they stay one pixel wide
// on screen regardless of the resolution of the media.

const SAFE_AREA_MARGIN = 0.05;

const drawGuides: OverlayRenderer = (context, width, height, scale) => {
  context.strokeStyle = '#cccccc';
  context.lineWidth = scale;

  context.setLineDash([]);
  context.strokeRect(
    width * SAFE_AREA_MARGIN,
    height * SAFE_AREA_MARGIN,
    width * (1 - 2 * SAFE_AREA_MARGIN),
    height * (1 - 2 * SAFE_AREA_MARGIN)
  );

  context.setLineDash([5 * scale, 5 * scale]);
  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();
};

const VideoPlayerBody = forwardRef<VideoPlayerRef, VideoPlayerProps>((props, ref) => {
  const { audioContext, inputNode, gainNodes, setChannelCount } = useAudioGraph();

  const [posFrames, setPosFrames] = useState(0);
  const [durFrames, setDurFrames] = useState(0);
  const [markIn, setMarkIn] = useState<number | null | undefined>(props.markIn);
  const [markOut, setMarkOut] = useState<number | null | undefined>(props.markOut);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loop, setLoop] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<TimeRange[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PlayerEngine | null>(null);

  const frameRateRef = useRef(props.frameRate);
  const loopRef = useRef(loop);
  const markInRef = useRef(markIn);
  const markOutRef = useRef(markOut);
  const durFramesRef = useRef(durFrames);

  useEffect(() => {
    frameRateRef.current = props.frameRate;
  }, [props.frameRate]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    durFramesRef.current = durFrames;
  }, [durFrames]);

  //
  // Engine
  //

  const seekToFrame = useCallback((frame: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    void engine.seek(frames2time(frame, frameRateRef.current));
  }, []);

  useEffect(() => {
    const engine = new PlayerEngine(
      {
        onTime: (time) => {
          const frame = time2frames(time, frameRateRef.current);
          setPosFrames(frame);

          // loop over the selected region during playback
          if (!loopRef.current || !engine.playing) return;
          const outFrame =
            markOutRef.current != null
              ? time2frames(markOutRef.current, frameRateRef.current)
              : durFramesRef.current - 1;
          const inFrame =
            markInRef.current != null
              ? time2frames(markInRef.current, frameRateRef.current)
              : 0;
          if (frame < outFrame || inFrame >= outFrame) return;
          void engine.seek(frames2time(inFrame, frameRateRef.current));
        },
        onDuration: (duration) => {
          setDurFrames(time2frames(duration, frameRateRef.current));
        },
        onPlayingChange: setIsPlaying,
        onLoadingChange: setLoading,
        onChannelCount: setChannelCount,
        onBufferedRanges: setBufferedRanges,
        onError: setError,
      },
      frameRateRef.current
    );
    engine.attachCanvas(canvasRef.current);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [setChannelCount]);

  useEffect(() => {
    engineRef.current?.setFrameRate(props.frameRate);
  }, [props.frameRate]);

  useEffect(() => {
    engineRef.current?.setAudioGraph(audioContext, inputNode);
  }, [audioContext, inputNode]);

  // Load the media

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setPosFrames(0);
    setError(null);
    if (props.src) {
      void engine.load(props.src);
    } else {
      engine.unload();
    }
  }, [props.src]);

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      seekToFrame(time2frames(time, props.frameRate));
    },
  }));

  //
  // Position and marks
  //

  useEffect(() => {
    if (!props.setPosition) return;
    props.setPosition(frames2time(posFrames, props.frameRate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posFrames, props.frameRate, props.setPosition]);

  useEffect(() => {
    if (props.setMarkIn) {
      props.setMarkIn(markIn ?? null);
    }
    markInRef.current = markIn;
    if (props.setMarkOut) {
      props.setMarkOut(markOut ?? null);
    }
    markOutRef.current = markOut;
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

  // Guides, drawn straight onto the video frame

  useEffect(() => {
    engineRef.current?.setOverlayRenderer(showOverlay ? drawGuides : null);
  }, [showOverlay]);

  // Overlays are scaled to the displayed size of the frame,
  // so the frame has to be repainted when the canvas is resized

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      engineRef.current?.redraw();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.unobserve(canvas);
    };
  }, []);

  //
  // Transport
  //

  const onPlayPause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.playing) {
      engine.pause();
    } else {
      void engine.play();
    }
  };

  // half of the nodes will be on the left, the other half on the right.
  // Keep the identity of the arrays stable - the meters treat a new array
  // as new audio and start their ballistics from scratch.
  const [leftNodes, rightNodes] = useMemo(
    () => [
      gainNodes.slice(0, gainNodes.length / 2),
      gainNodes.slice(gainNodes.length / 2),
    ],
    [gainNodes]
  );

  return (
    <VideoPlayerContainer>
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
            <VideoCanvas ref={canvasRef} />
            {loading && (
              <LoaderWrapper>
                <Loader />
              </LoaderWrapper>
            )}
            <ErrorBanner
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              {error || props.warning}
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
});

export { VideoPlayerBody };
