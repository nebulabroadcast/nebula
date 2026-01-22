import { useEffect, useRef } from 'react';

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
};

export const useKeyDown = (key: string, callback: () => void) => {
  const callbackRef = useRef(callback);
  // Update the ref to the latest callback on each render

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const editing = isEditableTarget(e.target);
      // If user is typing, only allow ctrl/meta shortcuts through
      if (editing && !e.ctrlKey && !e.metaKey) {
        return;
      }

      if (e.key === key) {
        callbackRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key]);
};
