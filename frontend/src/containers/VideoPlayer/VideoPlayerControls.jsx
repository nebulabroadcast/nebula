import { useEffect, useCallback, useRef, use } from 'react';

import { Button, InputTimecode, Navbar } from '/src/components';

const VideoPlayerControls = ({
  markIn,
  markOut,
  setMarkIn,
  setMarkOut,
  currentTime,
  duration,
  seekToTime,
  isPlaying,
  onPlayPause,
  frameRate,
}) => {
  const markInRef = useRef(markIn);
  const markOutRef = useRef(markOut);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);

  useEffect(() => {
    markInRef.current = markIn;
    markOutRef.current = markOut;
  }, [markIn, markOut]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const frameLength = 1 / frameRate;

  const handlePlayPause = () => {
    onPlayPause();
  };

  const handleGoToStart = () => {
    seekToTime(0);
  };
  const handleGoToEnd = () => {
    seekToTime(durationRef.current);
  };

  const handleGoBack1 = () => {
    seekToTime(currentTimeRef.current - frameLength);
  };
  const handleGoForward1 = () => {
    seekToTime(currentTimeRef.current + frameLength);
  };

  const handleGoBack5 = () => {
    seekToTime(currentTimeRef.current - 5 * frameLength);
  };
  const handleGoForward5 = () => {
    seekToTime(currentTimeRef.current + 5 * frameLength);
  };

  // Create mark in/out

  const handleMarkIn = () => {
    if (setMarkIn) setMarkIn(currentTimeRef.current);
  };

  const handleMarkOut = () => {
    if (setMarkOut) setMarkOut(currentTimeRef.current);
  };

  // Go to mark in/out

  const handleGoToMarkIn = () => {
    if (!markInRef.current) {
      console.log('No mark in set');
      return;
    }
    console.log('Going to mark in', markInRef.current);
    seekToTime(markInRef.current);
  };

  const handleGoToMarkOut = () => {
    if (!markOutRef.current) {
      console.log('No mark out set');
      return;
    }
    console.log('Going to mark out', markOutRef.current);
    seekToTime(markOutRef.current);
  };

  // Clear mark in/out

  const handleClearMarkIn = () => {
    if (setMarkIn) setMarkIn(null);
  };

  const handleClearMarkOut = () => {
    if (setMarkOut) setMarkOut(null);
  };

  const handleClearMarks = () => {
    if (setMarkIn) setMarkIn(null);
    if (setMarkOut) setMarkOut(null);
  };

  //
  // Keyboard shortcuts
  //

  useEffect(() => {
    const handleKeyDown = (e) => {
      // abort if modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // abort when shift key is pressed
      if (e.shiftKey) return;

      switch (e.key) {
        // Idiomatically play/pause with space
        case ' ':
          handlePlayPause();
          e.preventDefault();
          break;
        case 'ArrowLeft':
          handleGoBack1();
          e.preventDefault();
          break;
        case 'ArrowRight':
          handleGoForward1();
          e.preventDefault();
          break;

        // Go to start/end
        case 'a':
          handleGoToStart();
          break;
        case 's':
          handleGoToEnd();
          break;

        // Fast seek
        case 'j':
          handleGoBack5();
          break;
        case 'k':
          handlePlayPause();
          break;
        case 'l':
          handleGoForward5();
          break;

        // Avid-style seeking
        case '1':
          handleGoBack5();
          break;
        case '2':
          handleGoForward5();
          break;
        case '3':
          handleGoBack1();
          break;
        case '4':
          handleGoForward1();
          break;

        // Mark in/out
        case 'e':
          handleMarkIn();
          break;
        case 'r':
          handleMarkOut();
          break;
        case 'i':
          handleMarkIn();
          break;
        case 'o':
          handleMarkOut();
          break;

        // Go to mark in/out
        case 'q':
          handleGoToMarkIn();
          break;
        case 'w':
          handleGoToMarkOut();
          break;

        // Clear mark in/out
        case 'd':
          handleClearMarkIn();
          break;
        case 'f':
          handleClearMarkOut();
          break;
        case 'g':
          handleClearMarks();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Navbar tabIndex={1}>
      <InputTimecode value={markIn} tooltip="Selection start" />

      <Button
        tooltip="Clear selection start"
        icon="line_start_circle"
        onClick={handleClearMarkIn}
      />

      <Button
        tooltip="Set selelection start"
        icon="line_start"
        onClick={handleMarkIn}
      />

      <div style={{ flex: 1 }} />

      <Button
        icon="skip_previous"
        tooltip="Go to the first frame"
        onClick={handleGoToStart}
      />

      <Button
        tooltip="Go to selection start"
        icon="first_page"
        onClick={handleGoToMarkIn}
      />

      <Button
        icon="keyboard_double_arrow_left"
        tooltip="Go back 5 frames"
        onClick={handleGoBack5}
      />

      <Button icon="chevron_left" tooltip="Go back 1 frame" onClick={handleGoBack1} />

      <Button
        icon={isPlaying ? 'pause' : 'play_arrow'}
        tooltip={isPlaying ? 'Pause' : 'Play'}
        onClick={handlePlayPause}
      />

      <Button
        icon="chevron_right"
        tooltip="Go forward 1 frame"
        onClick={handleGoForward1}
      />

      <Button
        icon="keyboard_double_arrow_right"
        tooltip="Go forward 5 frames"
        onClick={handleGoForward5}
      />

      <Button
        tooltip="Go to selection end"
        icon="last_page"
        onClick={handleGoToMarkOut}
      />

      <Button icon="skip_next" tooltip="Go to the last frame" onClick={handleGoToEnd} />

      <div style={{ flex: 1 }} />

      <Button tooltip="Set selection end" icon="line_end" onClick={handleMarkOut} />

      <Button
        tooltip="Clear selection end"
        icon="line_end_circle"
        onClick={handleClearMarkOut}
      />

      <InputTimecode value={markOut} tooltip="Selection end" />
    </Navbar>
  );
};

export default VideoPlayerControls;
