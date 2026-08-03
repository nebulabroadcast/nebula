import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const COLOR_YELLOW = '#fcde00';
const COLOR_RED = '#ff2404';
const COLOR_GREEN = '#5fff5f';
const COLOR_BKG = '#19161f';
const COLOR_SCALE = '#2e2a36';

// Range of the scale
const MIN_DB = -60;
const MAX_DB = 0;

// Where the bar changes color
const YELLOW_DB = -18;
const RED_DB = -6;

// Marks drawn across the background of the meter
const SCALE_MARKS_DB = [-6, -18, -30, -42];

// Ballistics. Both the bar and the marker show the peak level: the bar
// jumps up instantly and falls at a constant rate, the marker stays at the
// highest peak for a moment before it starts falling, more slowly. Reading
// the same measurement means the marker always sits where the bar has just
// been, instead of hovering somewhere above it.
const FALL_RATE = 30; // dB per second
const PEAK_HOLD = 1.2; // seconds the marker stays where it is
const PEAK_FALL_RATE = 12; // dB per second

const BAR_WIDTH = 6;
const BAR_SPACING = 3;
const PEAK_HEIGHT = 2;

const MeterContainer = styled.div`
  height: 100%;
  position: relative;
  background-color: ${COLOR_BKG};
  flex: none;
`;

const MeterCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

/** Position of a level on the scale, 0 at the bottom, 1 at the top */
const dbToPosition = (db: number) => {
  if (db <= MIN_DB) return 0;
  if (db >= MAX_DB) return 1;
  return (db - MIN_DB) / (MAX_DB - MIN_DB);
};

const amplitudeToDb = (amplitude: number) =>
  amplitude > 0.0000001 ? 20 * Math.log10(amplitude) : MIN_DB;

interface VUMeterProps {
  gainNodes: GainNode[];
  audioContext: AudioContext | null;
}

const VUMeter: React.FC<VUMeterProps> = ({ gainNodes, audioContext }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ballistics live outside the effect, so that remounting the meter
  // (or a change of the audio graph) doesn't reset the levels to silence
  const ballisticsRef = useRef<{
    levels: number[];
    peaks: number[];
    peakHeldUntil: number[];
  }>({ levels: [], peaks: [], peakHeldUntil: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!(canvas && container && gainNodes.length && audioContext)) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    const numChannels = gainNodes.length;

    const analysers = gainNodes.map((gainNode) => {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      gainNode.connect(analyser);
      return analyser;
    });

    const samples = new Float32Array(analysers[0].fftSize);

    const ballistics = ballisticsRef.current;
    while (ballistics.levels.length < numChannels) {
      ballistics.levels.push(MIN_DB);
      ballistics.peaks.push(MIN_DB);
      ballistics.peakHeldUntil.push(0);
    }
    const { levels, peaks, peakHeldUntil } = ballistics;

    let animationFrameId: number;
    let lastFrameTime = performance.now() / 1000;

    const drawBarSection = (
      x: number,
      fromDb: number,
      toDb: number,
      height: number,
      color: string
    ) => {
      if (toDb <= fromDb) return;
      const bottom = dbToPosition(fromDb) * height;
      const top = dbToPosition(toDb) * height;
      context.fillStyle = color;
      context.fillRect(x, Math.round(height - top), BAR_WIDTH, Math.ceil(top - bottom));
    };

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      // Resize only when the size really changed. Assigning to width or
      // height clears the canvas, so doing it every frame makes the meter
      // flicker (the previous implementation compared an integer against
      // a fractional bounding box, so it resized on every single frame).
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(container.clientWidth * ratio);
      const height = Math.round(container.clientHeight * ratio);
      if (!width || !height) return;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const now = performance.now() / 1000;
      // clamp, so that levels don't jump after the tab was in the background
      const elapsed = Math.min(0.1, Math.max(0, now - lastFrameTime));
      lastFrameTime = now;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const meterHeight = container.clientHeight;

      context.fillStyle = COLOR_BKG;
      context.fillRect(0, 0, container.clientWidth, meterHeight);

      for (let index = 0; index < numChannels; index++) {
        analysers[index].getFloatTimeDomainData(samples);

        let peakAmplitude = 0;
        for (const sample of samples) {
          const amplitude = Math.abs(sample);
          if (amplitude > peakAmplitude) peakAmplitude = amplitude;
        }
        const peakDb = amplitudeToDb(peakAmplitude);

        // the bar jumps to the peak and falls at a constant rate
        if (peakDb >= levels[index]) {
          levels[index] = peakDb;
        } else {
          levels[index] = Math.max(peakDb, levels[index] - FALL_RATE * elapsed);
        }

        // the marker holds the highest position of the bar
        if (levels[index] >= peaks[index]) {
          peaks[index] = levels[index];
          peakHeldUntil[index] = now + PEAK_HOLD;
        } else if (now > peakHeldUntil[index]) {
          peaks[index] = Math.max(
            levels[index],
            peaks[index] - PEAK_FALL_RATE * elapsed
          );
        }

        const x = index * (BAR_WIDTH + BAR_SPACING) + BAR_SPACING;

        // scale marks, visible in the unlit part of the meter
        context.fillStyle = COLOR_SCALE;
        for (const markDb of SCALE_MARKS_DB) {
          const y = Math.round(meterHeight - dbToPosition(markDb) * meterHeight);
          context.fillRect(x, y, BAR_WIDTH, 1);
        }

        const level = levels[index];
        if (level > MIN_DB) {
          drawBarSection(
            x,
            MIN_DB,
            Math.min(level, YELLOW_DB),
            meterHeight,
            COLOR_GREEN
          );
          drawBarSection(
            x,
            YELLOW_DB,
            Math.min(level, RED_DB),
            meterHeight,
            COLOR_YELLOW
          );
          drawBarSection(x, RED_DB, level, meterHeight, COLOR_RED);
        }

        const peak = peaks[index];
        if (peak > MIN_DB) {
          const peakY = Math.round(meterHeight - dbToPosition(peak) * meterHeight);
          context.fillStyle =
            peak >= RED_DB ? COLOR_RED : peak >= YELLOW_DB ? COLOR_YELLOW : COLOR_GREEN;
          context.fillRect(
            x,
            Math.min(peakY, meterHeight - PEAK_HEIGHT),
            BAR_WIDTH,
            PEAK_HEIGHT
          );
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      gainNodes.forEach((gainNode, index) => {
        try {
          gainNode.disconnect(analysers[index]);
        } catch {
          // ignore
        }
      });
    };
  }, [gainNodes, audioContext]);

  if (!gainNodes.length) return null;

  const width = gainNodes.length * (BAR_WIDTH + BAR_SPACING) + BAR_SPACING;

  return (
    <MeterContainer ref={containerRef} style={{ width }}>
      <MeterCanvas ref={canvasRef} />
    </MeterContainer>
  );
};

export default VUMeter;
