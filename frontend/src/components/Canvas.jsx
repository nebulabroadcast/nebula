import { useEffect, forwardRef } from 'react';
import styled from 'styled-components';


const CanvasContainer = styled.div`
  position: relative;

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
`

const Canvas = forwardRef(({style, onDraw, ...props}, ref) => {
  useEffect(() => {
    if (!ref.current) return;
    const canvas = ref.current;

    const handleResize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      if (onDraw) {
        onDraw({target: canvas});
      }
    }

    handleResize();

    const parentElement = canvas.parentElement;
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(parentElement);

    return () => resizeObserver.unobserve(parentElement);

  }, [ref]);


  return (
    <CanvasContainer style={style}>
      <canvas ref={ref} {...props} />
    </CanvasContainer>
  );
});
Canvas.displayName = 'Canvas';


export default Canvas;
