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

import type { AssetData } from './types';

import nebula from '@/nebula';

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionData {
  segments?: Segment[];
}

interface SidePanelTranscriptionProps {
  position: number;
  frameRate: number;
  assetData: AssetData;
  patchAsset: (data: Partial<AssetData>) => void;
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

const getTranscription = async (assetId: number): Promise<Segment[]> => {
  let response = await nebula.getAux({
    body: { object_id: assetId, key: 'nebula:transcription', can_fail: true },
    throwOnError: true,
  });
  let tdata = response.data as TranscriptionData | null;

  if (tdata?.segments) {
    return tdata.segments;
  }

  response = await nebula.getAux({
    body: { object_id: assetId, key: 'openai:transcription', can_fail: true },
    throwOnError: true,
  });
  tdata = response.data as TranscriptionData | null;

  if (tdata?.segments) {
    return tdata.segments;
  }
  return [];
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
  patchAsset,
  setSelection,
  position,
}: SidePanelTranscriptionProps) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [changed, setChanged] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!changed) {
      return;
    }
    patchAsset({
      '__aux/nebula:transcription': {
        segments,
      },
    });
  }, [segments, patchAsset, changed]);

  const getCurrentSegmentIndex = () => {
    return segments.findIndex(
      (segment) => position >= segment.start && position < segment.end
    );
  };

  useEffect(() => {
    if (activeSegmentIndex === null) return;
    // update active segment when selection changes
    setSegments((prev) => {
      const newSegments = [...prev];
      const segment = newSegments[activeSegmentIndex];
      if (segment) {
        segment.start = selection.mark_in ?? segment.start;
        segment.end = selection.mark_out ?? segment.end;
      }
      return newSegments;
    });
    setChanged(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const getSegments = async (assetId: number) => {
    const segments = await getTranscription(assetId);
    setSegments(segments);
  };

  useEffect(() => {
    if (!assetData?.id) {
      setSegments([]);
      return;
    }

    const localTranscription = assetData[
      '__aux/nebula:transcription'
    ] as TranscriptionData | null;
    if (localTranscription?.segments) {
      setSegments(localTranscription.segments);
      return;
    }

    getSegments(assetData?.id).catch((err: unknown) => {
      console.error('Failed to fetch transcription:', err);
      setSegments([]);
    });
  }, [assetData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAdd = () => {
    const newSegment: Segment = {
      start: position,
      end: position + 1,
      text: '',
    };
    setSegments((prev) => {
      const newSegments = [...prev, newSegment].sort((a, b) => a.start - b.start);

      const newIndex = newSegments.indexOf(newSegment);
      setActiveSegmentIndex(newIndex);
      return newSegments;
    });
    setChanged(true);
  };

  const onDelete = (index: number) => {
    setActiveSegmentIndex(null);
    setChanged(true);
    setSegments((prev) => {
      const newSegments = [...prev];
      newSegments.splice(index, 1);
      return newSegments;
    });
  };

  const onTextChange = (index: number, text: string) => {
    setSegments((prev) => {
      const newSegments = [...prev];
      newSegments[index] = { ...newSegments[index], text };
      return newSegments;
    });
    setChanged(true);
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
