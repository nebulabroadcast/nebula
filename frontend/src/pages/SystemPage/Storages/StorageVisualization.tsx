import styled from 'styled-components';

import { formatBytes, type StorageStats } from './common';

const VizContainer = styled.div`
  flex-grow: 1;
  display: flex;
  min-height: 12px;
`;

interface VizSegmentProps {
  $color: string;
  $size: number;
}

const VizSegment = styled.div<VizSegmentProps>`
  width: ${(p) => p.$size}%;
  background: ${(p) => p.$color} 0%;
  display: flex;
  height: 100%;
  position: relative;
  border-right: 4px solid ${(p) => p.$color};
  min-width: 1px;
  transition: width 0.3s ease;
`;

interface StorageVisualizationProps {
  storage: StorageStats;
  showFree: boolean;
  showUntracked: boolean;
}

const StorageVisualization = ({
  storage,
  showFree,
  showUntracked,
}: StorageVisualizationProps) => {
  const storageSize = storage.total;
  const usedSize = storage.used;
  const untrackedSize = storage.untracked;
  const freeSize = storageSize - usedSize;

  let displaySize = storage.total;
  if (!showFree) {
    displaySize -= freeSize;
  }
  if (!showUntracked) {
    displaySize -= untrackedSize;
  }

  return (
    <VizContainer>
      {storage.nebula_usage.map((segment, idx) => (
        <VizSegment
          key={idx}
          title={`${segment.label}: ${formatBytes(segment.usage)}`}
          $color={segment.color}
          $size={(segment.usage / displaySize) * 100}
        ></VizSegment>
      ))}

      {showUntracked && untrackedSize > 0 && (
        <VizSegment
          title={`Untracked: ${formatBytes(untrackedSize)}`}
          $color="var(--color-surface-07)"
          $size={(untrackedSize / displaySize) * 100}
        />
      )}

      {showFree && freeSize > 0 && (
        <VizSegment
          title={`Free: ${formatBytes(freeSize)}`}
          $color="var(--color-surface-03)"
          $size={(freeSize / displaySize) * 100}
        />
      )}
    </VizContainer>
  );
};

export default StorageVisualization;
