import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

const TooltipContent = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: fixed;
  top: ${(props) => props.$y}px;
  left: ${(props) => props.$x}px;
  transform: translate(-50%, -100%);
  margin-top: -10px;
  background-color: var(--color-surface-04);
  color: var(--color-text-hl);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  z-index: 10000;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  width: max-content;
  max-width: 320px;
  text-align: center;
  line-height: 1.5;
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: opacity 0.15s ease-out;

  p {
    margin: 0;
  }

  code {
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
  }

  strong {
    color: var(--color-yellow);
  }
`;

interface TooltipState {
  content: string;
  x: number;
  y: number;
  visible: boolean;
}

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<TooltipState>({
    content: '',
    x: 0,
    y: 0,
    visible: false,
  });

  const timerRef = useRef<number | null>(null);

  const hideTooltip = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showTooltip = useCallback((content: string, x: number, y: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      setState({ content, x, y, visible: true });
    }, 600); // 600ms delay for standard feel
  }, []);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(
        '[data-tooltip], [title]'
      ) as HTMLElement;

      if (target) {
        const tooltipContent =
          target.getAttribute('data-tooltip') || target.getAttribute('title');

        if (tooltipContent) {
          // If it was a 'title', move it to 'data-tooltip' to prevent native browser tooltip
          if (target.hasAttribute('title')) {
            target.setAttribute('data-tooltip', tooltipContent);
            target.removeAttribute('title');
          }

          const rect = target.getBoundingClientRect();
          showTooltip(tooltipContent, rect.left + rect.width / 2, rect.top);
        }
      } else {
        hideTooltip();
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null;
      if (!target) {
        return;
      }

      const related = e.relatedTarget as HTMLElement | null;

      // Hide the tooltip only if the mouse actually left the tooltip target,
      // not when moving between its descendants.
      if (!related || !target.contains(related)) {
        hideTooltip();
      }
    };

    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('mousedown', hideTooltip);
    window.addEventListener('scroll', hideTooltip, true);

    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('mousedown', hideTooltip);
      window.removeEventListener('scroll', hideTooltip, true);
    };
  }, [showTooltip, hideTooltip]);

  return (
    <>
      {children}
      {state.content && (
        <TooltipContent
          $x={state.x}
          $y={state.y}
          $visible={state.visible}
          role="tooltip"
        >
          <ReactMarkdown>{state.content}</ReactMarkdown>
        </TooltipContent>
      )}
    </>
  );
};
