import type { VideoPlayerRef } from '@containers/VideoPlayer/types';
import { useRef, useState } from 'react';

import { PlayerContext, type Selection } from './playerContext';

// The preview's player and the sidebar tabs that work with it share this
// state; they're rendered apart (the sidebar sits beside either editor mode).
export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const [position, setPosition] = useState(0);
  const [selection, setSelection] = useState<Selection>({
    mark_in: null,
    mark_out: null,
  });
  return (
    <PlayerContext.Provider
      value={{ videoPlayerRef, position, setPosition, selection, setSelection }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
