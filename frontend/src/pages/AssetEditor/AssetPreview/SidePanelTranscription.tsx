import { ScrollBox, Section } from '@components';
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
  assetData: AssetData;
  videoPlayerRef: React.RefObject<VideoPlayerRef | null>;
  setSelection: React.Dispatch<
    React.SetStateAction<{ mark_in: number | null; mark_out: number | null }>
  >;
}

interface SegmentWidgetProps {
  position: number;
  segment: Segment;
  onClick: (segment: Segment) => void;
}

const SegmentWidget: React.FC<SegmentWidgetProps> = ({
  segment,
  onClick,
  position,
}) => {
  return (
    <div
      onClick={() => {
        onClick(segment);
      }}
      style={{
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '4px',
        backgroundColor: 'var(--color-surface-03)',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor:
          position >= segment.start && position <= segment.end
            ? 'var(--color-cyan)'
            : 'transparent',
      }}
    >
      {segment.text}
    </div>
  );
};

export const SidePanelTranscription = ({
  assetData,
  videoPlayerRef,
  setSelection,
  position,
}: SidePanelTranscriptionProps) => {
  const [segments, setSegments] = useState<Segment[]>([]);

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

  const onClick = (segment: Segment) => {
    if (videoPlayerRef.current) {
      setSelection({ mark_in: segment.start, mark_out: segment.end });
      videoPlayerRef.current.seek(segment.start);
    }
  };

  return (
    <Section className="grow">
      <ScrollBox>
        {segments?.length === 0 ? (
          <p>No transcription available for this asset.</p>
        ) : (
          segments.map((segment, index) => (
            <SegmentWidget
              key={index}
              segment={segment}
              onClick={onClick}
              position={position}
            />
          ))
        )}
      </ScrollBox>
    </Section>
  );
};
