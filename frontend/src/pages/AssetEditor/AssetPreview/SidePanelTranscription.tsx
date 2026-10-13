import {
  ScrollBox,
  Navbar,
  Section,
  TextArea,
  Button,
  InputTimecode,
  Spacer,
  InputText,
} from '@components';
import { VideoPlayerRef } from '@containers/VideoPlayer/types.ts';
import { useKeyDown } from '@lib/useKeyDown';
import { useState, useEffect } from 'react';

import type { AuxChanges } from '../assetApi';

import type { AssetData } from './types';

import nebula from '@/nebula';

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionData {
  language?: string | null;
  segments?: Segment[];
}

interface SidePanelTranscriptionProps {
  position: number;
  frameRate: number;
  assetData: AssetData;
  auxChanges: AuxChanges;
  setAux: (key: string, data: unknown) => void;
  videoPlayerRef: React.RefObject<VideoPlayerRef | null>;
  selection: { mark_in: number | null; mark_out: number | null };
  setSelection: React.Dispatch<
    React.SetStateAction<{ mark_in: number | null; mark_out: number | null }>
  >;
}

interface SegmentWidgetProps {
  position: number;
  frameRate: number;
  hidden?: boolean;
  segment: Segment;
  nextSegment?: Segment;
  index: number;
  onDelete: (index: number) => void;
  onTextChange: (text: string) => void;
  onClick: (segment: Segment) => void;
  isActive: boolean;
  isCurrent: boolean;
  onActivate?: () => void;
}

// Edits are always saved here
const TRANSCRIPTION_KEY = 'nebula:transcription';
// Where a stored transcription is read from, in order of preference
const SOURCE_KEYS = [TRANSCRIPTION_KEY, 'openai:transcription'];

// The asset's stored transcription. Only keys the asset has (`__aux`) are
// requested, so a missing transcription costs no request.
const loadTranscription = async (
  assetId: number,
  auxKeys: string[]
): Promise<TranscriptionData> => {
  for (const key of SOURCE_KEYS) {
    if (!auxKeys.includes(key)) continue;
    const response = await nebula.assetsAuxGet({
      path: { asset_id: assetId, key },
      throwOnError: true,
    });
    const data = response.data as TranscriptionData | null;
    if (data?.segments) return data;
  }
  return {};
};

const SegmentWidget: React.FC<SegmentWidgetProps> = ({
  segment,
  hidden,
  frameRate,
  nextSegment,
  index,
  onDelete,
  onTextChange,
  onClick,
  isActive,
  isCurrent,
  onActivate,
}) => {
  const sep = nextSegment && nextSegment.start < segment.end && (
    <div style={{ color: 'var(--color-red)', fontSize: '12px' }}>
      Warning: This segment overlaps with the next one.
      {segment.end} {'>'} {nextSegment.start}
    </div>
  );

  if (hidden) return null;

  if (!isActive) {
    return (
      <>
        <div
          onClick={(e) => {
            e.preventDefault();
            onClick(segment);
          }}
          onDoubleClick={(e) => {
            if (onActivate) {
              e.preventDefault();
              onActivate();
            }
          }}
          style={{
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: 'var(--color-surface-03)',
            borderWidth: 2,
            borderStyle: 'solid',
            userSelect: 'none',
            borderColor: isCurrent ? 'var(--color-cyan)' : 'transparent',
          }}
        >
          {segment.text}
        </div>
        {sep}
      </>
    );
  }

  return (
    <>
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick(segment);
        }}
        style={{
          borderRadius: '4px',
          backgroundColor: 'var(--color-surface-03)',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: isCurrent ? 'var(--color-cyan)' : 'transparent',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            flexDirection: 'row',
          }}
        >
          <InputTimecode
            value={segment.start}
            readOnly={true}
            tooltip="Content start"
            fps={frameRate}
          />
          <InputTimecode
            value={segment.end}
            readOnly={true}
            tooltip="Content end"
            fps={frameRate}
          />
          <Spacer />
          <Button
            icon="delete"
            tooltip="Clear marks"
            onClick={() => {
              onDelete(index);
            }}
          />
        </div>

        <TextArea
          value={segment.text}
          onChange={onTextChange}
          autoFocus
          style={{ minHeight: '40px' }}
        />
      </div>
      {sep}
    </>
  );
};

export const SidePanelTranscription = ({
  assetData,
  frameRate,
  videoPlayerRef,
  selection,
  auxChanges,
  setAux,
  setSelection,
  position,
}: SidePanelTranscriptionProps) => {
  const [stored, setStored] = useState<TranscriptionData>({});
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Unsaved edits live in the editor's aux changes, so they survive switching
  // panels and are saved with the asset. Without edits, the stored version
  // is shown.
  const draft = auxChanges[TRANSCRIPTION_KEY] as TranscriptionData | undefined;
  const segments = draft?.segments ?? stored.segments ?? [];
  const hasDraft = draft !== undefined;
  const auxKeys = (assetData.__aux as string[] | undefined) ?? [];

  const updateSegments = (update: (segments: Segment[]) => Segment[]) => {
    setAux(TRANSCRIPTION_KEY, { ...stored, segments: update(segments) });
  };

  // (Re)load the stored transcription for a new asset, when its aux keys
  // change, and when the edits are saved or reverted
  useEffect(() => {
    if (!assetData.id) {
      setStored({});
      return;
    }
    if (hasDraft) return;
    let cancelled = false;
    loadTranscription(assetData.id, auxKeys)
      .then((data) => {
        if (!cancelled) setStored(data);
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch transcription:', err);
        if (!cancelled) setStored({});
      });
    return () => {
      cancelled = true;
    };
  }, [assetData.id, auxKeys.join(','), hasDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCurrentSegmentIndex = () => {
    return segments.findIndex(
      (segment) => position >= segment.start && position < segment.end
    );
  };

  useEffect(() => {
    // the selection moves the marks of the active segment
    if (activeSegmentIndex === null) return;
    const segment = segments[activeSegmentIndex];
    if (!segment) return;
    const start = selection.mark_in ?? segment.start;
    const end = selection.mark_out ?? segment.end;
    if (start === segment.start && end === segment.end) return;
    updateSegments((prev) =>
      prev.map((s, i) => (i === activeSegmentIndex ? { ...s, start, end } : s))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const onAdd = () => {
    const newSegment: Segment = {
      start: position,
      end: position + 1,
      text: '',
    };
    const newSegments = [...segments, newSegment].sort((a, b) => a.start - b.start);
    setActiveSegmentIndex(newSegments.indexOf(newSegment));
    updateSegments(() => newSegments);
  };

  const onDelete = (index: number) => {
    setActiveSegmentIndex(null);
    updateSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const onTextChange = (index: number, text: string) => {
    updateSegments((prev) => prev.map((s, i) => (i === index ? { ...s, text } : s)));
  };

  const onClick = (segment: Segment) => {
    if (videoPlayerRef.current) {
      setSelection({ mark_in: segment.start, mark_out: segment.end });
      videoPlayerRef.current.seek(segment.start + 0.02); //correct for potential rounding issues
    }

    if (segment !== segments[activeSegmentIndex ?? -1]) {
      // clicking the active segment again deactivates it
      setActiveSegmentIndex(null);
    }
  };

  useKeyDown('M', () => {
    if (activeSegmentIndex === null) return;
    const nextIndex = activeSegmentIndex + 1;
    if (nextIndex < segments.length) {
      setActiveSegmentIndex(nextIndex);
      const segment = segments[nextIndex];
      if (videoPlayerRef.current) {
        setSelection({ mark_in: segment.start, mark_out: segment.end });
        videoPlayerRef.current.seek(segment.start + 0.02);
      }
    }
  });

  useKeyDown('N', () => {
    if (activeSegmentIndex === null) return;
    const prevIndex = activeSegmentIndex - 1;
    if (prevIndex >= 0) {
      setActiveSegmentIndex(prevIndex);
      const segment = segments[prevIndex];
      if (videoPlayerRef.current) {
        setSelection({ mark_in: segment.start, mark_out: segment.end });
        videoPlayerRef.current.seek(segment.start + 0.02);
      }
    }
  });

  const searchFilter = (segment: Segment) => {
    if (!searchTerm) return true;
    return segment.text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  return (
    <>
      <Navbar>
        <InputText
          placeholder="Search transcription..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <Button icon="add" onClick={onAdd} tooltip="Add segment" />
      </Navbar>
      <Section className="grow column">
        <ScrollBox>
          {!segments?.length ? (
            <p>No transcription available for this asset.</p>
          ) : (
            segments.map((segment, index) => (
              <SegmentWidget
                key={index}
                frameRate={frameRate}
                segment={segment}
                nextSegment={segments[index + 1]}
                onClick={onClick}
                onDelete={onDelete}
                onTextChange={(text) => {
                  onTextChange(index, text);
                }}
                position={position}
                index={index}
                isActive={index === activeSegmentIndex}
                isCurrent={index === getCurrentSegmentIndex()}
                hidden={!searchFilter(segment)}
                onActivate={() => {
                  setActiveSegmentIndex(index);
                }}
              />
            ))
          )}
        </ScrollBox>
      </Section>
    </>
  );
};
