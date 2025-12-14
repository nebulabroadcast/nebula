import React, { useEffect, forwardRef } from 'react';
import styled from 'styled-components';

const CanvasContainer = styled.div`
  position: relative;
  padding: 0;
  margin: 0;

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
`;

interface CanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  style?: React.CSSProperties;
  onDraw?: (event: { target: HTMLCanvasElement }) => void;
}

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ style, onDraw, ...props }, ref) => {
    useEffect(() => {
      if (typeof ref === 'function' || !ref?.current) return;
      const canvas = ref.current;

      const handleResize = () => {
        if (!canvas.parentElement) return;
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        if (onDraw) {
          onDraw({ target: canvas });
        }
      };

      handleResize();

      const parentElement = canvas.parentElement;
      if (!parentElement) return;
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(parentElement);

      return () => resizeObserver.unobserve(parentElement);
    }, [ref, onDraw]);

    return (
      <CanvasContainer style={style}>
        <canvas ref={ref} {...props} />
      </CanvasContainer>
    );
  }
);
Canvas.displayName = 'Canvas';

export default Canvas;
