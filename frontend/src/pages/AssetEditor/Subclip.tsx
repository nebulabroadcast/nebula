import { Timecode } from '@wfoxall/timeframe';
import React from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

import { InputText, Button } from '@/components';

const SubclipRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 4px;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--color-border);
`;

const SubclipContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: var(--color-surface-03);
  border: 1px solid var(--color-surface-04);
  width: 100%;

  h3 {
    font-family: monospace;
    font-size: 12px;
    margin: 0;
    padding: 4px;
  }
`;

interface SubclipData {
  title: string;
  mark_in: number;
  mark_out: number;
}

interface SubclipProps {
  index: number;
  title: string;
  mark_in: number;
  mark_out: number;
  setSubclips: React.Dispatch<React.SetStateAction<SubclipData[]>>;
  selection: { mark_in: number | null; mark_out: number | null };
  setSelection: (selection: {
    mark_in: number | null;
    mark_out: number | null;
  }) => void;
  fps: number;
  onSeek: (time: number) => void;
}

const Subclip: React.FC<SubclipProps> = ({
  index,
  title,
  mark_in,
  mark_out,
  setSubclips,
  selection,
  setSelection,
  fps,
  onSeek,
}) => {
  const onSetMarks = (marks: { mark_in: number | null; mark_out: number | null }) => {
    setSubclips((subclips) => {
      const newSubclips = [...subclips];
      newSubclips[index] = {
        ...newSubclips[index],
        mark_in: marks.mark_in || 0,
        mark_out: marks.mark_out || 0,
      };
      return newSubclips;
    });
  };

  const onTitleChange = (e: string) => {
    setSubclips((subclips) => {
      const newSubclips = [...subclips];
      newSubclips[index] = { ...newSubclips[index], title: e };
      return newSubclips;
    });
  };

  const onRemove = () => {
    setSubclips((subclips) => {
      const newSubclips = [...subclips];
      newSubclips.splice(index, 1);
      return newSubclips;
    });
  };

  const startTC = new Timecode(Math.floor(mark_in * fps), fps);
  const endTC = new Timecode(Math.floor(mark_out * fps), fps);

  const updateSubclip = () => {
    if (selection.mark_in === null || selection.mark_out === null) {
      toast.error('Please select a region first');
      return;
    }

    if (selection.mark_in >= selection.mark_out) {
      toast.error('Please select a valid region');
      return;
    }

    if (selection.mark_out - selection.mark_in < 2.0 / fps) {
      toast.error('Region must be at least 2 frames long.');
      return;
    }
    onSetMarks(selection);
  };

  const showSubclip = () => {
    setSelection({
      mark_in: mark_in || null,
      mark_out: mark_out || null,
    });
    onSeek(mark_in);
  };

  return (
    <SubclipContainer>
      <h3>
        {startTC.toString()} - {endTC.toString()}
      </h3>
      <SubclipRow>
        <Button
          icon="screenshot_region"
          tooltip="Update subclip from selection"
          onClick={updateSubclip}
        />
        <Button
          icon="delete"
          tooltip="Delete subclip"
          onClick={() => {
            onRemove();
          }}
        />
        <InputText value={title} onChange={onTitleChange} style={{ flex: 1 }} />
        <Button icon="frame_inspect" tooltip="Select region" onClick={showSubclip} />
      </SubclipRow>
    </SubclipContainer>
  );
};

export default Subclip;
