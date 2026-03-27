import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { Canvas, Navbar } from '@components';

const MARK_SIZE = 6;

interface TrackbarProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onScrub: (time: number) => void;
  onScrubFinished?: (time: number) => void;
  markIn?: number;
  markOut?: number;
  bufferedRanges: { start: number; end: number }[];
  frameRate: number;
  marks?: Record<string, number>;
}

const Trackbar: React.FC<TrackbarProps> = ({
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const targetTimeRef = useRef<number>(0);

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
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    //
    // Draw the background of the slider
    //

    ctx.fillStyle = '#19161f';
    ctx.clearRect(0, 0, width, height);
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

    //
    // Draw the buffered ranges
    //

    for (const range of bufferedRanges) {
      const start = (range.start / duration) * width;
      const end = (range.end / duration) * width;
      ctx.strokeStyle = '#885bff';
      ctx.beginPath();
      ctx.moveTo(start, 0);
      ctx.lineTo(end, 0);
      ctx.stroke();
    }

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

    //
    // Draw the selection marks
    //

    let markInX = 0;
    if (markIn !== undefined) {
      markInX = (markIn / duration) * width;
      ctx.strokeStyle = 'green';
      ctx.fillStyle = 'green';
      ctx.beginPath();
      ctx.moveTo(markInX, height - MARK_SIZE);
      ctx.lineTo(markInX, height);
      ctx.lineTo(markInX - MARK_SIZE, height);
      ctx.lineTo(markInX, height - MARK_SIZE);
      ctx.stroke();
      ctx.fill();
    }

    let markOutX = width;
    if (markOut !== undefined) {
      markOutX = (markOut / duration) * width + frameWidth;
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(markOutX, height - MARK_SIZE);
      ctx.lineTo(markOutX, height);
      ctx.lineTo(markOutX + MARK_SIZE, height);
      ctx.lineTo(markOutX, height - MARK_SIZE);
      ctx.stroke();
      ctx.fill();
    }

    ctx.strokeStyle = markOutX > markInX ? '#0ed3fe' : 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(markInX + 1, height - 1);
    ctx.lineTo(markOutX - 1, height - 1);
    ctx.stroke();

    //
    // Draw the poster frame indicator
    //

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
  }, [
    currentTime,
    duration,
    markIn,
    markOut,
    marks,
    numFrames,
    isPlaying,
    frameRate,
    bufferedRanges,
    auxMarks.poster_frame,
  ]);

  //
  // Event handling
  //

  useEffect(() => {
    drawSlider();
  }, [drawSlider]);

  // Dragging

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = (x / rect.width) * duration;
      targetTimeRef.current = newTime;
      if (!isDragging) return;
      onScrub(newTime);
    },
    [duration, isDragging, onScrub]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (onScrubFinished) {
      onScrubFinished(targetTimeRef.current);
    }
  }, [onScrubFinished]);

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
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    // Trigger initial scrub
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    targetTimeRef.current = newTime;
    onScrub(newTime);
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
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
