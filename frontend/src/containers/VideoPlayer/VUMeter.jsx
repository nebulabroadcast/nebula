import { useState, useEffect, useRef } from 'react';
import { Canvas } from '/src/components';

const COLOR_YELLOW = '#fcde00';
const COLOR_RED = '#ff2404';
const COLOR_GREEN = '#5fff5f';
const COLOR_BKG = '#19161f';

const VUMeter = ({ gainNodes, audioContext }) => {
  const canvasRef = useRef(null);
  const gainNodesRef = useRef(null);
  const [redrawTrigger, setRedrawTrigger] = useState(0);

  const barWidth = 6;
  const spacing = 3;

  useEffect(() => {
    if (!gainNodes) return;
    gainNodesRef.current = gainNodes;
  }, [gainNodes]);

  useEffect(() => {
    console.log('VUMeter: init');
    const canvas = canvasRef.current;
    const gainNodes = gainNodesRef.current;

    if (!(canvas && gainNodes?.length && audioContext)) {
      console.log('VUMeter: canvas or gainNodes not found');
      return;
    }

    const numChannels = gainNodes.length;
    const ctx = canvas.getContext('2d');
    const analysers = gainNodes.map(() => audioContext.createAnalyser());

    gainNodes.forEach((gainNode, index) => {
      gainNode.connect(analysers[index]);
      analysers[index].fftSize = 256;
      analysers[index].smoothingTimeConstant = 0.8;
    });

    const bufferLength = analysers[0].frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (canvas.height !== canvas.parentElement.clientHeight) {
        canvas.height = canvas.parentElement.clientHeight;
      }

      canvas.width = numChannels * (barWidth + spacing) + spacing;
      canvas.style.width = `${canvas.width}px`;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // draw background regardless of audio data
      ctx.fillStyle = COLOR_BKG;
      for (let i = 0; i < numChannels; i++) {
        const x = i * (barWidth + spacing);
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
        let volume = 20 * Math.log10(rms);

        const MIN_DB = -40;
        volume = ((volume - MIN_DB) / -MIN_DB) * 100;

        // Clamp green section to 60%
        const greenHeight = (Math.min(volume, 60) / 100) * canvas.height;

        // 20% over 60% is yellow
        const yellowHeight =
          ((volume > 80 ? 20 : volume > 60 ? volume - 60 : 0) / 100) * canvas.height;

        // everything over 80% is red
        const redHeight = ((volume > 80 ? volume - 80 : 0) / 100) * canvas.height;

        const x = index * (barWidth + spacing);

        // Draw green section
        ctx.fillStyle = COLOR_GREEN;
        ctx.fillRect(x, canvas.height - greenHeight, barWidth, greenHeight);

        // Draw yellow section
        if (yellowHeight > 0) {
          ctx.fillStyle = COLOR_YELLOW;
          ctx.fillRect(
            x,
            canvas.height - greenHeight - yellowHeight,
            barWidth,
            yellowHeight
          );
        }

        // Draw red section
        if (redHeight > 0) {
          ctx.fillStyle = COLOR_RED;
          ctx.fillRect(
            x,
            canvas.height - greenHeight - yellowHeight - redHeight,
            barWidth,
            redHeight
          );
        }
      });

      setTimeout(() => requestAnimationFrame(draw), 1000 / 30);
    };

    draw();
  }, [gainNodesRef.current?.length, audioContext, canvasRef, redrawTrigger]);

  return (
    <Canvas
      ref={canvasRef}
      style={{ width: gainNodes.length * (barWidth + spacing) }}
      onDraw={() => setRedrawTrigger(redrawTrigger + 1)}
    />
  );
};

export default VUMeter;
