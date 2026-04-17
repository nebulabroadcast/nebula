import { ScrollBox, Section, TextArea, Button, InputTimecode, Spacer } from '@components';
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

interface SidePanelTranscriptionProps {
  position: number;
  frameRate: number;
  assetData: AssetData;
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
  )


  if (!isActive) {
    return (
      <>
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick(segment);
          }}
          onDoubleClick={(e) => {
            if (onActivate) {
              e.preventDefault();
              e.stopPropagation();
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
    )
  }

  return (
    <>
      <div
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
          style={{ display: 'flex', gap: 4, alignItems: 'center', flexDirection: 'row' }}
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
            onClick={() => { onDelete(index); }}
          />
        </div>


        <TextArea
          value={segment.text}
          onChange={() => { }}
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
  setSelection,
  position,
}: SidePanelTranscriptionProps) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);


  const getCurrentSegmentIndex = () => {
    return segments.findIndex(
      (segment) => position >= segment.start && position < segment.end
    );
  }

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  useEffect(() => {
    if (!assetData?.id) {
      setSegments([]);
      return;
    }

    nebula
      .request('get_transcription', { id_asset: assetData.id })
      .then((response) => {
        setSegments(response.data.segments);
      })
      .catch((error) => {
        console.error('Error fetching transcription:', error);
        setSegments([]);
      });
  }, [assetData?.id]);


  const onDelete = (index: number) => {
    setActiveSegmentIndex(null);
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
              onActivate={() => { setActiveSegmentIndex(index); }}
            />
          ))
        )}


      </ScrollBox>
    </Section>
  );
};
