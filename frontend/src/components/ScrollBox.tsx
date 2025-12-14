import styled from 'styled-components';
import React from 'react';

const ScrollContainer = styled.div`
  flex-grow: 1;
  position: relative;
`;

const ScrollContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  overflow-x: auto;
  gap: 6px;
`;

interface ScrollBoxProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const ScrollBox: React.FC<ScrollBoxProps> = ({ children, style }) => {
  return (
    <ScrollContainer style={style}>
      <ScrollContent>{children}</ScrollContent>
    </ScrollContainer>
  );
};

export default ScrollBox;
