import {
  ALL_FORMATS,
  AudioBufferSink,
  CanvasSink,
  Input,
  UrlSource,
  type WrappedCanvas,
} from 'mediabunny';

// How far ahead of the playback position audio is scheduled, in seconds
const AUDIO_LOOKAHEAD = 0.5;

// How many decoded frames are kept ready for display
const FRAME_QUEUE_SIZE = 8;

// Playback clock starts this many seconds after play is requested,
// giving the decoders a moment to fill the pipeline first
const PLAYBACK_START_DELAY = 0.1;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Draws on top of the video frame. Receives the canvas context, the size of
 * the frame and the ratio between the frame and its displayed size, so that
 * lines can be drawn with a constant width on screen.
 */
export type OverlayRenderer = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number
) => void;

export interface TimeRange {
  start: number;
  end: number;
}

export interface PlayerEngineCallbacks {
  onTime: (time: number) => void;
  onDuration: (duration: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onLoadingChange: (loading: boolean) => void;
  onChannelCount: (channels: number) => void;
  onBufferedRanges: (ranges: TimeRange[]) => void;
  onError: (message: string | null) => void;
}

/**
 * Media player engine backed by mediabunny.
 *
 * Video frames are decoded on demand and drawn to a canvas, audio is decoded
 * to AudioBuffers and scheduled to a Web Audio graph, which also serves as
 * the playback clock. Unlike a video element, seeking is immediate, frame
 * accurate and cannot get stuck: every request supersedes the previous one.
 */
export class PlayerEngine {
  private callbacks: PlayerEngineCallbacks;
  private frameRate: number;

  private canvas: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;

  private audioContext: AudioContext | null = null;
  private audioDestination: AudioNode | null = null;

  private input: Input | null = null;
  private videoSink: CanvasSink | null = null;
  private audioSink: AudioBufferSink | null = null;

  private durationValue = 0;
  private currentTimeValue = 0;
  private playingValue = false;

  // Asynchronous work (decoding, scheduling) belonging to a superseded
  // playback pass is discarded by bumping this counter.
  private generation = 0;

  // Bumped when the media itself changes. Still frames are only tied to
  // this, not to the playback generation: while scrubbing, every decoded
  // frame is worth displaying, even if a newer position was requested in
  // the meantime.
  private sourceGeneration = 0;

  private overlayRenderer: OverlayRenderer | null = null;
  private lastFrame: WrappedCanvas | null = null;

  // Byte ranges read from the source so far, used to show what part of
  // the media is available without another round trip
  private byteRanges: TimeRange[] = [];
  private sourceSize: number | null = null;
  private rangesTimer: number | null = null;

  private frameQueue: WrappedCanvas[] = [];
  private audioSources = new Set<AudioBufferSourceNode>();
  private rafId: number | null = null;

  // Mapping between the audio clock and the position in the media
  private clockOrigin = 0;
  private clockOriginMedia = 0;

  private pendingStill: number | null = null;
  private stillInFlight = false;

  private lastEmittedFrame = -1;

  constructor(callbacks: PlayerEngineCallbacks, frameRate: number) {
    this.callbacks = callbacks;
    this.frameRate = frameRate;
  }

  //
  // Configuration
  //

  attachCanvas(canvas: HTMLCanvasElement | null) {
    this.canvas = canvas;
    this.canvasContext = canvas?.getContext('2d') ?? null;
  }

  /** Set (or clear) what is drawn over the video frames, and repaint */
  setOverlayRenderer(renderer: OverlayRenderer | null) {
    this.overlayRenderer = renderer;
    this.redraw();
  }

  /** Repaint the current frame, e.g. when the canvas was resized */
  redraw() {
    if (this.lastFrame) this.drawFrame(this.lastFrame);
  }

  /**
   * Set the node decoded audio is routed to. Called whenever the audio graph
   * is rebuilt (the channel count of the media changed).
   */
  setAudioGraph(audioContext: AudioContext | null, destination: AudioNode | null) {
    this.audioContext = audioContext;
    this.audioDestination = destination;
  }

  setFrameRate(frameRate: number) {
    this.frameRate = frameRate;
  }

  get duration() {
    return this.durationValue;
  }

  get currentTime() {
    return this.currentTimeValue;
  }

  get playing() {
    return this.playingValue;
  }

  //
  // Loading
  //

  async load(src: string) {
    this.unload();
    this.callbacks.onError(null);
    this.callbacks.onLoadingChange(true);

    this.generation += 1;
    this.sourceGeneration += 1;
    const generation = this.generation;

    try {
      const source = new UrlSource(src);
      // every read tells us a bit more about what part of the media
      // we already have at hand
      source.on('read', ({ start, end }) => {
        this.trackRead(start, end);
      });

      const input = new Input({ formats: ALL_FORMATS, source });
      this.input = input;

      this.sourceSize = await source.getSizeOrNull();
      if (generation !== this.generation) return;

      const videoTrack = await input.getPrimaryVideoTrack();
      if (generation !== this.generation) return;
      if (!videoTrack) {
        throw new Error('The file does not contain a video track');
      }
      if (!(await videoTrack.canDecode())) {
        const codec = await videoTrack.getCodec();
        throw new Error(`Unsupported video codec (${codec ?? 'unknown'})`);
      }
      if (generation !== this.generation) return;
      this.videoSink = new CanvasSink(videoTrack);

      const audioTrack = await input.getPrimaryAudioTrack();
      if (generation !== this.generation) return;
      if (audioTrack && (await audioTrack.canDecode())) {
        this.audioSink = new AudioBufferSink(audioTrack);
        this.callbacks.onChannelCount(await audioTrack.getNumberOfChannels());
      } else {
        this.audioSink = null;
        this.callbacks.onChannelCount(0);
      }
      if (generation !== this.generation) return;

      const duration =
        (await input.getDurationFromMetadata()) ?? (await input.computeDuration());
      if (generation !== this.generation) return;

      this.durationValue = duration;
      this.callbacks.onDuration(duration);
      this.emitRanges();

      this.currentTimeValue = 0;
      this.emitTime(0, true);
      this.pendingStill = 0;
      await this.processStills();
    } catch (error) {
      if (generation === this.generation) this.reportError(error);
    } finally {
      if (generation === this.generation) this.callbacks.onLoadingChange(false);
    }
  }

  unload() {
    this.generation += 1;
    this.sourceGeneration += 1;
    this.stopPlayback();
    this.input?.dispose();
    this.input = null;
    this.videoSink = null;
    this.audioSink = null;
    this.durationValue = 0;
    this.currentTimeValue = 0;
    this.lastEmittedFrame = -1;
    this.pendingStill = null;
    this.lastFrame = null;
    this.clearCanvas();

    if (this.rangesTimer !== null) {
      clearTimeout(this.rangesTimer);
      this.rangesTimer = null;
    }
    this.byteRanges = [];
    this.sourceSize = null;

    this.callbacks.onDuration(0);
    this.callbacks.onTime(0);
    this.callbacks.onBufferedRanges([]);
  }

  //
  // Availability of the media
  //

  private trackRead(start: number, end: number) {
    const ranges = [...this.byteRanges, { start, end }];
    ranges.sort((a, b) => a.start - b.start);

    const merged: TimeRange[] = [];
    for (const range of ranges) {
      const last = merged[merged.length - 1];
      if (last && range.start <= last.end) {
        last.end = Math.max(last.end, range.end);
      } else {
        merged.push({ ...range });
      }
    }
    this.byteRanges = merged;

    // reads come in bursts, no reason to repaint the trackbar for each
    if (this.rangesTimer !== null) return;
    this.rangesTimer = window.setTimeout(() => {
      this.rangesTimer = null;
      this.emitRanges();
    }, 250);
  }

  /** Byte ranges mapped onto the timeline, assuming a constant bitrate */
  private emitRanges() {
    const size = this.sourceSize;
    const duration = this.durationValue;
    if (!size || !duration) return;
    this.callbacks.onBufferedRanges(
      this.byteRanges.map((range) => ({
        start: (range.start / size) * duration,
        end: (range.end / size) * duration,
      }))
    );
  }

  private clearCanvas() {
    const canvas = this.canvas;
    this.canvasContext?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0);
  }

  destroy() {
    this.unload();
    this.attachCanvas(null);
    this.setAudioGraph(null, null);
  }

  //
  // Transport
  //

  async play() {
    if (this.playingValue || !this.videoSink) return;
    // when sitting at the very end, start over
    if (this.currentTimeValue >= this.durationValue - 1 / this.frameRate) {
      this.currentTimeValue = 0;
    }
    this.playingValue = true;
    this.callbacks.onPlayingChange(true);
    await this.startPipeline(this.currentTimeValue);
  }

  pause() {
    if (!this.playingValue) return;
    this.playingValue = false;
    this.generation += 1;
    this.stopPlayback();
    this.callbacks.onPlayingChange(false);
    // snap the display back to the exact frame we stopped at
    this.requestStill(this.currentTimeValue);
  }

  async seek(time: number) {
    const target = this.clampTime(time);
    this.currentTimeValue = target;
    this.emitTime(target, true);

    if (this.playingValue) {
      await this.startPipeline(target);
      return;
    }

    this.generation += 1;
    this.requestStill(target);
  }

  private clampTime(time: number) {
    if (!(this.durationValue > 0)) return Math.max(0, time);
    const last = Math.max(0, this.durationValue - 1 / this.frameRate);
    return Math.max(0, Math.min(time, last));
  }

  private emitTime(time: number, force = false) {
    this.currentTimeValue = time;
    const frame = Math.round(time * this.frameRate);
    if (!force && frame === this.lastEmittedFrame) return;
    this.lastEmittedFrame = frame;
    this.callbacks.onTime(time);
  }

  private reportError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.callbacks.onError(message);
  }

  //
  // Still frames (seeking while paused, scrubbing)
  //

  /**
   * Display the frame at the given position. Only one decode runs at a time,
   * and only the most recent request is served, so scrubbing never queues up
   * work it no longer needs.
   */
  private requestStill(time: number) {
    this.pendingStill = time;
    if (this.stillInFlight) return;
    void this.processStills();
  }

  private async processStills() {
    this.stillInFlight = true;
    try {
      while (this.pendingStill !== null) {
        const time = this.pendingStill;
        this.pendingStill = null;
        const sink = this.videoSink;
        if (!sink) break;
        const sourceGeneration = this.sourceGeneration;
        try {
          // ask for the middle of the frame, so that rounding of the
          // requested position can't land us on the previous one
          const wrapped = await sink.getCanvas(time + 0.5 / this.frameRate);
          // Display it unless it belongs to media we no longer show or
          // playback took over the canvas in the meantime. A newer position
          // may have been requested while decoding - that one is served by
          // the next turn of this loop, so drawing this frame keeps the
          // picture moving while scrubbing instead of waiting it out.
          if (sourceGeneration !== this.sourceGeneration || this.playingValue) continue;
          if (wrapped) this.drawFrame(wrapped);
        } catch (error) {
          // errors of superseded requests are not interesting
          if (sourceGeneration === this.sourceGeneration) this.reportError(error);
        }
      }
    } finally {
      this.stillInFlight = false;
    }
  }

  private drawFrame(wrapped: WrappedCanvas) {
    const canvas = this.canvas;
    const context = this.canvasContext;
    if (!canvas || !context) return;

    const source = wrapped.canvas;
    if (canvas.width !== source.width || canvas.height !== source.height) {
      canvas.width = source.width;
      canvas.height = source.height;
    }
    context.drawImage(source, 0, 0);
    this.lastFrame = wrapped;

    const renderer = this.overlayRenderer;
    if (!renderer) return;

    context.save();
    renderer(context, canvas.width, canvas.height, this.displayScale());
    context.restore();
  }

  /**
   * How many canvas pixels there are per displayed pixel. The canvas is
   * scaled down to fit the layout (object-fit: contain), so overlays have to
   * scale their line widths accordingly to stay crisp.
   */
  private displayScale() {
    const canvas = this.canvas;
    if (!canvas || !canvas.clientWidth || !canvas.clientHeight) return 1;
    const frameAspect = canvas.width / canvas.height;
    const boxAspect = canvas.clientWidth / canvas.clientHeight;
    const displayedWidth =
      boxAspect > frameAspect ? canvas.clientHeight * frameAspect : canvas.clientWidth;
    return displayedWidth > 0 ? canvas.width / displayedWidth : 1;
  }

  //
  // Playback
  //

  private async startPipeline(from: number) {
    this.generation += 1;
    const generation = this.generation;

    this.stopPlayback();

    const audioContext = this.audioContext;
    if (audioContext && audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch {
        // playing without audio is still better than not playing at all
      }
      if (generation !== this.generation) return;
    }

    this.clockOrigin = this.now() + PLAYBACK_START_DELAY;
    this.clockOriginMedia = from;

    void this.decodeVideo(generation, from);
    if (this.audioSink && audioContext && this.audioDestination) {
      void this.scheduleAudio(generation, from);
    }

    this.startRenderLoop(generation);
  }

  /** Stop everything belonging to the current playback pass */
  private stopPlayback() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.stopAudioSources();
    this.frameQueue = [];
  }

  private stopAudioSources() {
    for (const source of this.audioSources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // never started
      }
      source.disconnect();
    }
    this.audioSources.clear();
  }

  private now() {
    return this.audioContext?.currentTime ?? performance.now() / 1000;
  }

  /** Position in the media the clock is currently at */
  private mediaTime() {
    const elapsed = this.now() - this.clockOrigin;
    if (elapsed <= 0) return this.clockOriginMedia;
    return this.clockOriginMedia + elapsed;
  }

  private startRenderLoop(generation: number) {
    const step = () => {
      // a seek or a pause during the previous step supersedes this loop
      if (!this.playingValue || generation !== this.generation) return;

      const mediaTime = this.mediaTime();

      // display the newest frame that is already due
      let frame: WrappedCanvas | null = null;
      while (this.frameQueue.length > 0 && this.frameQueue[0].timestamp <= mediaTime) {
        frame = this.frameQueue.shift() ?? null;
      }
      if (frame) this.drawFrame(frame);

      this.emitTime(Math.min(mediaTime, this.durationValue));

      // the time callback may have seeked somewhere else (looping)
      if (generation !== this.generation) return;

      if (this.durationValue > 0 && mediaTime >= this.durationValue) {
        this.currentTimeValue = this.clampTime(this.durationValue);
        this.pause();
        return;
      }

      this.rafId = requestAnimationFrame(step);
    };

    this.rafId = requestAnimationFrame(step);
  }

  private async decodeVideo(generation: number, from: number) {
    const sink = this.videoSink;
    if (!sink) return;

    const frames = sink.canvases(from);
    try {
      for await (const wrapped of frames) {
        if (generation !== this.generation) return;
        this.frameQueue.push(wrapped);
        // decode ahead, but not more than the queue holds
        while (
          generation === this.generation &&
          this.playingValue &&
          this.frameQueue.length >= FRAME_QUEUE_SIZE
        ) {
          await sleep(15);
        }
        if (generation !== this.generation) return;
      }
    } catch (error) {
      if (generation === this.generation) this.reportError(error);
    } finally {
      await frames.return();
    }
  }

  private async scheduleAudio(generation: number, from: number) {
    const sink = this.audioSink;
    const audioContext = this.audioContext;
    const destination = this.audioDestination;
    if (!sink || !audioContext || !destination) return;

    const buffers = sink.buffers(from);
    try {
      for await (const wrapped of buffers) {
        if (generation !== this.generation) return;

        const when = this.clockOrigin + (wrapped.timestamp - this.clockOriginMedia);
        const now = audioContext.currentTime;

        if (when + wrapped.duration > now) {
          const source = audioContext.createBufferSource();
          source.buffer = wrapped.buffer;
          source.connect(destination);
          if (when >= now) {
            source.start(when);
          } else {
            // we are late: start right away, skipping what we missed
            source.start(now, now - when);
          }
          this.audioSources.add(source);
          source.onended = () => {
            this.audioSources.delete(source);
          };
        }

        // don't schedule (and decode) further ahead than necessary
        while (
          generation === this.generation &&
          this.playingValue &&
          when - audioContext.currentTime > AUDIO_LOOKAHEAD
        ) {
          await sleep(50);
        }
        if (generation !== this.generation) return;
      }
    } catch (error) {
      if (generation === this.generation) this.reportError(error);
    } finally {
      await buffers.return();
    }
  }
}
