import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const COLOR_YELLOW = '#fcde00';
const COLOR_RED = '#ff2404';
const COLOR_GREEN = '#5fff5f';
const COLOR_BKG = '#19161f';

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

interface VUMeterProps {
  gainNodes: GainNode[];
  audioContext: AudioContext | null;
}

const VUMeter: React.FC<VUMeterProps> = ({ gainNodes, audioContext }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const barWidth = 6;
  const spacing = 3;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!(canvas && container && gainNodes?.length && audioContext)) {
      return;
    }

    const numChannels = gainNodes.length;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analysers = gainNodes.map(() => {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      return analyser;
    });

    gainNodes.forEach((gainNode, index) => {
      gainNode.connect(analysers[index]);
    });

    const bufferLength = analysers[0].fftSize;
    const dataArray = new Uint8Array(bufferLength);

    // Keep track of displayed levels for smoothing
    const currentLevels = new Array(numChannels).fill(0);

    let animationFrameId: number;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // Update canvas resolution if needed
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background bars
      ctx.fillStyle = COLOR_BKG;
      for (let i = 0; i < numChannels; i++) {
        const x = i * (barWidth + spacing) + spacing;
        ctx.fillRect(x, 0, barWidth, canvas.height);
      }

      gainNodes.forEach((_, index) => {
        analysers[index].getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const value = (dataArray[i] - 128) / 128;
          sum += value * value;
        }

        const rms = Math.sqrt(sum / bufferLength);
        const volumeDb = rms > 0.0001 ? 20 * Math.log10(rms) : -100;

        const MIN_DB = -60;
        const MAX_DB = 0;
        let targetLevel = ((volumeDb - MIN_DB) / (MAX_DB - MIN_DB)) * 100;
        targetLevel = Math.max(0, Math.min(100, targetLevel));

        // Smooth: fast rise, slow decay
        if (targetLevel > currentLevels[index]) {
          currentLevels[index] = targetLevel;
        } else {
          currentLevels[index] *= 0.95; // slower decay for smoother visualization
        }

        const level = currentLevels[index];
        const x = index * (barWidth + spacing) + spacing;

        // Draw the bar with sections
        const greenEnd = 0.6;
        const yellowEnd = 0.8;

        const greenH = Math.min(level / 100, greenEnd) * canvas.height;
        const yellowH =
          Math.max(0, Math.min(level / 100, yellowEnd) - greenEnd) * canvas.height;
        const redH = Math.max(0, level / 100 - yellowEnd) * canvas.height;

        ctx.fillStyle = COLOR_GREEN;
        ctx.fillRect(x, canvas.height - greenH, barWidth, greenH);

        if (yellowH > 0) {
          ctx.fillStyle = COLOR_YELLOW;
          ctx.fillRect(x, canvas.height - greenH - yellowH, barWidth, yellowH);
        }

        if (redH > 0) {
          ctx.fillStyle = COLOR_RED;
          ctx.fillRect(x, canvas.height - greenH - yellowH - redH, barWidth, redH);
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      gainNodes.forEach((gainNode, index) => {
        try {
          gainNode.disconnect(analysers[index]);
        } catch (e) {
          // ignore
        }
      });
    };
  }, [gainNodes, audioContext]);

  const width = gainNodes.length * (barWidth + spacing) + spacing;

  return (
    <MeterContainer ref={containerRef} style={{ width }}>
      <MeterCanvas ref={canvasRef} />
    </MeterContainer>
  );
};

export default VUMeter;
