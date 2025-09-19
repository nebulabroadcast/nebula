import styled from "styled-components";
import { getTheme } from "/src/components/theme";
import { formatBytes } from './common';

const VizContainer = styled.div`
  flex-grow: 1;
  display: flex;
  min-height: 12px;
`

const VizSegment = styled.div`
  width: ${(p) => p.size}%;
  background: ${(p) => p.color} 0%;
  display: flex;
  height: 100%;
  position: relative;
  border-right: 4px solid ${(p) => p.color};
  min-width: 1px;
`;


const StorageVisualization = ({storage}) => {
  const storageSize = storage.total;
  const usedSize = storage.used;
  const untrackedSize = storageSize - storage.nebula_usage.reduce((acc, seg) => acc + seg.usage, 0);
  const freeSize = storageSize - usedSize;

  return (
    <VizContainer>
     {storage.nebula_usage.map((segment, idx) => (
        <VizSegment 
          key={idx} 
          size={segment.usage / storage.total *100}
          color={segment.color} 
          title={`${segment.label}: ${formatBytes(segment.usage)}`}
        >
        </VizSegment>
      ))}

      {untrackedSize > 0 && (
      <VizSegment
        title={`Untracked: ${formatBytes(untrackedSize)}`}
        size={ untrackedSize / storage.total * 100 }
        color={getTheme().colors.surface07}
      />
      )}

      {freeSize > 0 && (
      <VizSegment
        title={`Free: ${formatBytes(freeSize)}`}
        size={ freeSize / storage.total * 100 }
        color={getTheme().colors.surface03}
      />
      )}


    </VizContainer>
  )

}

export default StorageVisualization;




/*
 *
 *
const Viz = styled.div`
  flex: 0;
`;

const Square = styled.rect`
  shape-rendering: crispEdges;
`;
      <Viz>
        <svg width={svgWidth} height={svgHeight}>
          {squares.map((square, idx) => {
            const x = (idx % cols) * (size + gap);
            const y = Math.floor(idx / cols) * (size + gap);
            return (
              <Square
                key={idx}
                x={x}
                y={y}
                width={size}
                height={size}
                fill={square.color}
                title={square.label}
              />
            );
          })}
        </svg>
      </Viz>
*/
