import React, {useState, useEffect} from "react";
import styled from "styled-components";

import nebula from '/src/nebula';

const Row = styled.section`
  display: flex;
  overflow: hidden;
`;

const Meta = styled.div`
  width: 250px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Label = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`;

const Availability = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  margin-top: 0.3rem;

  &::before {
    content: "";
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(p) => (p.available ? "#4caf50" : "#f44336")};
    margin-right: 0.5rem;
  }
`;

const Sizes = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #aaa;
`;

const Viz = styled.div`
  flex: 0;
  border: 1px solid #444;
`;

const Square = styled.rect`
  shape-rendering: crispEdges;
`;

const formatBytes = (bytes) => {
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
};

const StorageRow = ({ storage }) => {
  const cols = 100; // squares per row
  const rows = 10;  // number of rows
  const totalSquares = cols * rows;

  const usedPercent = storage.used / storage.total;
  const usedSquares = Math.round(totalSquares * usedPercent);

  // assign squares to categories based on usage share
  let squares = [];
  let filled = 0;

  storage.nebula_usage.forEach((cat) => {
    const share = cat.usage / storage.used;
    const count = Math.max(1, Math.round(usedSquares * share));
    for (let i = 0; i < count; i++) {
      squares.push(cat);
    }
    filled += count;
  });

  // Fill any leftover used squares with a fallback color
  while (filled < usedSquares) {
    squares.push({color: "#666"});
    filled++;
  }

  // Remaining squares = free space
  while (squares.length < totalSquares) {
    squares.push({color: "#222", label: "Free"});
  }

  const size = 10; // px
  const gap = 2;   // px
  const svgWidth = cols * (size + gap);
  const svgHeight = rows * (size + gap);

  return (
    <Row>
      <Meta>
        <Label>{storage.label}</Label>
        <Availability available={storage.available}>
          {storage.available ? "Available" : "Offline"}
        </Availability>
        <Sizes>
          {formatBytes(storage.used)} / {formatBytes(storage.total)} (
          {(usedPercent * 100).toFixed(1)}%)
        </Sizes>
      </Meta>
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
    </Row>
  );
};

const StoragesPage = () => {
  const [data, setData] = useState({ storages: [] });

  useEffect(() => {
    nebula.request("stats/storages").then(response => {
      setData(response.data);
      })
  }, []);

  return(
  <main style={{
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "center",
  }}>
    {data.storages.map((s) => (
      <StorageRow key={s.storage_id} storage={s} />
    ))}
  </main>
  )
};

export default StoragesPage;

