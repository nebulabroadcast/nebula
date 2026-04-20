import {
  ScrollBox,
  Section,
  TextArea,
  Button,
  InputTimecode,
  Spacer,
} from '@components';
import { VideoPlayerRef } from '@containers/VideoPlayer/types.ts';
import { useState } from 'react';
import { useEffect } from 'react';

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
  segment: Segment;
  nextSegment?: Segment;
  index: number;
  onDelete: (index: number) => void;
  onClick: (segment: Segment) => void;
  isActive: boolean;
  isCurrent: boolean;
  onActivate?: () => void;
}

const getTranscription = async (assetId: number): Promise<Segment[]> => {
  let response = await nebula.request('get-aux', {
    object_id: assetId,
    key: 'nebula:transcription',
    can_fail: true,
  });
  let tdata = response.data as TranscriptionData | null;

  if (tdata?.segments) {
    return tdata.segments;
  }

  response = await nebula.request('get-aux', {
    object_id: assetId,
    key: 'openai:transcription',
    can_fail: true,
  });
  tdata = response.data as TranscriptionData | null;

  if (tdata?.segments) {
    return tdata.segments;
  }
  return [];
};

const SegmentWidget: React.FC<SegmentWidgetProps> = ({
  segment,
  frameRate,
  nextSegment,
  index,
  onDelete,
  onClick,
  isActive,
  isCurrent,
  onActivate,
}) => {
  const sep = nextSegment && nextSegment.start < segment.end && (
    <div style={{ color: 'var(--color-red)', fontSize: '12px' }}>
      Warning: This segment overlaps with the next one.
    </div>
  );

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
          onChange={() => {}}
          readOnly
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

  useEffect(() => {
    if (!changed) {
      console.log('No changes to save for transcription segments');
      return;
    }

    console.log('Patching asset with new transcription segments', segments);
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
    getSegments(assetData?.id).catch((err: unknown) => {
      console.error('Failed to fetch transcription:', err);
      setSegments([]);
    });
  }, [assetData?.id]);

  const onDelete = (index: number) => {
    setActiveSegmentIndex(null);
    setChanged(true);
    setSegments((prev) => {
      const newSegments = [...prev];
      newSegments.splice(index, 1);
      return newSegments;
    });
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

  return (
    <Section className="grow">
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
              position={position}
              index={index}
              isActive={index === activeSegmentIndex}
              isCurrent={index === getCurrentSegmentIndex()}
              onActivate={() => {
                setActiveSegmentIndex(index);
              }}
            />
          ))
        )}
      </ScrollBox>
    </Section>
  );
};
