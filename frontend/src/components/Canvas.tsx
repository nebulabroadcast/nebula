import React, { useEffect, forwardRef } from 'react';

import './Canvas.css';

interface CanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  style?: React.CSSProperties;
  onDraw?: (event: { target: HTMLCanvasElement }) => void;
}

export const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
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

      return () => {
        resizeObserver.unobserve(parentElement);
      };
    }, [ref, onDraw]);

    return (
      <div className="nb-canvas-container" style={style}>
        <canvas ref={ref} {...props} />
      </div>
    );
  }
);
Canvas.displayName = 'Canvas';
