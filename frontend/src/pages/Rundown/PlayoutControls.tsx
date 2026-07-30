import { Button, Progress } from '@components';
import { useNebula } from '@features/Nebula';
import clsx from 'clsx';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

import PlayoutPlugins from './PlayoutPlugins';

import type { PlayoutAction } from '@/client';
import nebula from '@/nebula';


const ControlsSection = styled.section`
  flex-direction: column;
  gap: 8px;

  &.warn {
    .progress {
      background-color: var(--color-red);
    }
  }
`;

const DisplayRow = styled.div`
  display: flex;
  gap: 12px;
`;

const BaseDisplay = styled.div`
  background-color: var(--color-surface-01);
  padding: 4px 8px;
  font-weight: bold;
  user-select: none;
`;

const DisplayTime = styled(BaseDisplay)`
  flex-basis: 140px;
  font-family: var(--font-family-mono), monospace;
`;

const DisplayName = styled(BaseDisplay)`
  flex-grow: 1;
`;

const ButtonRow = styled.div`
  flex-direction: row;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;

  button {
    width: 80px !important;
  }
`;

const s2tc = (seconds: number, fps: number) => {
  if (isNaN(seconds)) return '--:--:--:--';
  const h = Math.floor(seconds / 3600) % 24;
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * fps);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
};

interface PlayoutControlsProps {
  playoutStatus: any;
  rundownMode: string;
  loadRundown: () => void;
  onError: (error: any) => void;
}

const PlayoutControls: React.FC<PlayoutControlsProps> = ({
  playoutStatus,
  rundownMode,
  loadRundown,
  onError,
}) => {
  const { currentChannelId } = useNebula();

  const [progress, setProgress] = useState(0);
  const [progressClassName, setProgressClassName] = useState<string | null>(null);

  const statusRef = useRef<any>(playoutStatus);

  const dispClkRef = useRef<HTMLDivElement>(null);
  const dispPosRef = useRef<HTMLDivElement>(null);
  const dispRemRef = useRef<HTMLDivElement>(null);
  const dispDurRef = useRef<HTMLDivElement>(null);
  const dispCurRef = useRef<HTMLDivElement>(null);
  const dispNxtRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date().getTime() / 1000;
    statusRef.current = { ...playoutStatus, receivedAt: now };

    if (playoutStatus?.duration) {
      const progressValue =
        ((playoutStatus?.position || 0) / playoutStatus?.duration) * 100;
      setProgress(progressValue);

      if (playoutStatus.duration - playoutStatus.position < 10) {
        setProgressClassName('warn');
      } else {
        setProgressClassName(null);
      }
    }
  }, [playoutStatus]);

  const onTimer = () => {
    if (!statusRef.current) return;

    const now = new Date().getTime() / 1000;
    const { position, duration, receivedAt, current_title, cued_title } =
      statusRef.current;
    const elapsed = now - (receivedAt || now);
    const fps = 25;
    const estimatedPos = Math.max(0, (position || 0) + elapsed);
    const estimatedRem = Math.max(0, (duration || 0) - estimatedPos);

    const localNow = new Date();
    const localOffset = localNow.getTimezoneOffset() * 60;

    const dispClk = 'CLK: ' + s2tc(now - localOffset, fps);
    const dispPos = 'POS: ' + s2tc(estimatedPos, fps);
    const dispRem = 'REM: ' + s2tc(estimatedRem, fps);
    const dispDur = 'DUR: ' + s2tc(Math.max(0, duration || 0), fps);
    const dispCur = 'CUR: ' + (current_title || '');
    const dispNxt = 'NXT: ' + (cued_title || '');

    if (dispClkRef.current) dispClkRef.current.innerText = dispClk;
    if (dispPosRef.current) dispPosRef.current.innerText = dispPos;
    if (dispRemRef.current) dispRemRef.current.innerText = dispRem;
    if (dispDurRef.current) dispDurRef.current.innerText = dispDur;
    if (dispCurRef.current) dispCurRef.current.innerText = dispCur;
    if (dispNxtRef.current) dispNxtRef.current.innerText = dispNxt;
  };

  useEffect(() => {
    const timer = setInterval(onTimer, 40);
    return () => { clearInterval(timer); };
  }, []);

  const onCommand = (command: PlayoutAction, payload?: Record<string, unknown>) => {
    if (currentChannelId === null) return;
    console.log('Command', command);
    nebula
      .playout({
        body: { id_channel: currentChannelId, action: command, payload },
        throwOnError: true,
      })
      .then(loadRundown)
      .catch(onError);
  };

  return (
    <>
      <ControlsSection className={clsx(progressClassName)}>
        <DisplayRow>
          <DisplayTime ref={dispClkRef}></DisplayTime>
          <DisplayName ref={dispCurRef}></DisplayName>
          <DisplayTime ref={dispRemRef}></DisplayTime>
        </DisplayRow>

        <DisplayRow>
          <DisplayTime ref={dispPosRef}></DisplayTime>
          <DisplayName ref={dispNxtRef}></DisplayName>
          <DisplayTime ref={dispDurRef}></DisplayTime>
        </DisplayRow>

        <Progress value={progress} />
      </ControlsSection>
      {rundownMode === 'control' && (
        <ControlsSection>
          <ButtonRow>
            <Button
              label="Take"
              style={{ border: '1px solid var(--color-green-muted)' }}
              onClick={() => { onCommand('take'); }}
            />
            <Button
              label="Freeze"
              style={{ border: '1px solid var(--color-red-muted)' }}
              onClick={() => { onCommand('freeze'); }}
            />
            <Button label="Retake" onClick={() => { onCommand('retake'); }} />
            <Button label="Abort" onClick={() => { onCommand('abort'); }} />
            <Button label="Loop" onClick={() => toast.error('not implemented')} />
            <Button label="Cue prev" onClick={() => { onCommand('cue_backward'); }} />
            <Button label="Cue next" onClick={() => { onCommand('cue_forward'); }} />
          </ButtonRow>
        </ControlsSection>
      )}

      {rundownMode === 'plugins' && <PlayoutPlugins onError={onError} />}
    </>
  );
};

export default PlayoutControls;
