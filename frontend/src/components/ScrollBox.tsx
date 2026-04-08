import React from 'react';
import './ScrollBox.css';

interface ScrollBoxProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const ScrollBox: React.FC<ScrollBoxProps> = ({ children, style }) => {
  return (
    <div className="nb-scroll-box" style={style}>
      <div className="nb-scroll-content">{children}</div>
    </div>
  );
};
