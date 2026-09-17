import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

import './TooltipProvider.css';

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
  const tooltipRef = useRef<HTMLDivElement>(null);

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
      const target = (e.target as HTMLElement).closest('[data-tooltip], [title]');

      if (!target) {
        hideTooltip();
        return;
      }

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
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]');
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
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showTooltip, hideTooltip]);

  // Promote the tooltip into the browser's top layer via the Popover API.
  // A modal <dialog>'s ::backdrop also lives in the top layer and paints
  // above every ordinary (non-top-layer) element regardless of z-index, so
  // a plain fixed-position tooltip gets hidden behind an open dialog's
  // shade. Showing the tooltip as a popover puts it in the top layer too,
  // above the dialog, since it's opened after the dialog is.
  useEffect(() => {
    const el = tooltipRef.current;
    if (!el || typeof el.showPopover !== 'function') return;
    if (state.visible) {
      if (!el.matches(':popover-open')) el.showPopover();
    } else if (el.matches(':popover-open')) {
      el.hidePopover();
    }
  }, [state.visible]);

  return (
    <>
      {children}
      <div
        ref={tooltipRef}
        popover="manual"
        className="nb-tooltip-content"
        style={{
          top: state.y,
          left: state.x,
          opacity: state.visible ? 1 : 0,
        }}
        role="tooltip"
      >
        <ReactMarkdown>{state.content}</ReactMarkdown>
      </div>
    </>
  );
};
