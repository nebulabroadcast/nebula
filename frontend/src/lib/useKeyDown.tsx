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
      // Function keys (F1 - F12) don't type: they work while typing too,
      // and replace what the browser does with them (F1 opens its help)
      const functionKey = /^F\d{1,2}$/.test(e.key);
      const editing = isEditableTarget(e.target);
      // If user is typing, only allow ctrl/meta shortcuts through
      if (editing && !functionKey && !e.ctrlKey && !e.metaKey) {
        return;
      }

      if (e.key === key) {
        if (functionKey) e.preventDefault();
        callbackRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key]);
};
