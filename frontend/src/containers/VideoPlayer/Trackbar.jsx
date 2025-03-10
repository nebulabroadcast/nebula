import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { Canvas, Navbar } from '/src/components';

const Trackbar = ({
  duration,
  currentTime,
  isPlaying,
  onScrub,
  onScrubFinished,
  markIn,
  markOut,
  bufferedRanges,
  frameRate,
  marks,
}) => {
  const canvasRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const targetTimeRef = useRef(null);

  const auxMarks = marks || {};

  const numFrames = useMemo(
    () => Math.round(duration * frameRate),
    [frameRate, duration]
  );
  // DRAW

  const drawSlider = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw the background of the slider
    ctx.fillStyle = '#19161f';
    ctx.fillRect(0, 0, width, height);

    const frameWidth = numFrames >= width ? 2 : width / numFrames;
    const handleWidth = Math.max(frameWidth, 2);

    if (numFrames < width / 4) {
      for (let i = 1; i < numFrames; i++) {
        const x = (i / numFrames) * width;
        ctx.strokeStyle = '#303030';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Draw the buffered ranges
    for (const range of bufferedRanges) {
      const start = (range.start / duration) * width;
      const end = (range.end / duration) * width;
      ctx.strokeStyle = '#885bff';
      ctx.beginPath();
      ctx.moveTo(start, 0);
      ctx.lineTo(end, 0);
      ctx.stroke();
    }

    let markInX = 0;
    if (markIn) {
      markInX = (markIn / duration) * width;
      ctx.strokeStyle = 'green';
      ctx.beginPath();
      ctx.moveTo(markInX, 0);
      ctx.lineTo(markInX, height);
      ctx.stroke();
    }

    let markOutX = width;
    if (markOut) {
      markOutX = (markOut / duration) * width;
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(markOutX, 0);
      ctx.lineTo(markOutX, height);
      ctx.stroke();
    }

    ctx.strokeStyle = markOutX > markInX ? '#0ed3fe' : 'red';
    ctx.beginPath();
    ctx.moveTo(markInX, height - 1);
    ctx.lineTo(markOutX, height - 1);
    ctx.stroke();

    //
    // Draw the handle
    //

    let currentFrame;
    if (isPlaying) {
      currentFrame = Math.round(currentTime * frameRate);
      if (currentFrame >= numFrames) {
        currentFrame = numFrames - 1;
      }
    } else {
      currentFrame = Math.round(currentTime * frameRate);
    }

    const progressX =
      currentFrame >= numFrames ? width : (currentFrame / numFrames) * width;

    ctx.fillStyle = '#0ed3fe';
    ctx.beginPath();
    ctx.fillRect(progressX - 1, 0, handleWidth, height);
    ctx.fill();

    // Draw the poster frame

    if (auxMarks.poster_frame) {
      const posterFrameX = (auxMarks.poster_frame / duration) * width + frameWidth / 2;
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.moveTo(posterFrameX - 4, 0);
      ctx.lineTo(posterFrameX + 4, 0);
      ctx.lineTo(posterFrameX, 4);
      ctx.closePath();
      ctx.fill();
    }
  }, [currentTime, duration, markIn, markOut, marks]);

  // Events

  useEffect(() => {
    drawSlider();
  }, [currentTime, duration, markIn, markOut, marks]);

  // Dragging

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    targetTimeRef.current = newTime;
    if (!isDragging) return;
    onScrub(newTime);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (onScrubFinished) {
      onScrubFinished(targetTimeRef.current);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    targetTimeRef.current = newTime;
    onScrub(newTime);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      drawSlider();
    });

    resizeObserverRef.current.observe(canvasRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [drawSlider]);

  return (
    <Navbar>
      <Canvas
        ref={canvasRef}
        style={{ minHeight: 42, maxHeight: 42, cursor: 'pointer', flexGrow: 1 }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDraw={drawSlider}
      />
    </Navbar>
  );
};

export default Trackbar;
