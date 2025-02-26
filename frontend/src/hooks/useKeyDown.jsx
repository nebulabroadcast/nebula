import { useEffect, useRef } from 'react';

const useKeyDown = (key, callback) => {
  const callbackRef = useRef(callback);

  // Update the ref to the latest callback on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (e) => {
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

export default useKeyDown;
