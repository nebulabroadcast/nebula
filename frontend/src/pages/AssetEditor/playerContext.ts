import type { VideoPlayerRef } from '@containers/VideoPlayer/types';
import { createContext, useContext } from 'react';

export interface Selection {
  mark_in: number | null;
  mark_out: number | null;
}

export interface PlayerContextValue {
  videoPlayerRef: React.RefObject<VideoPlayerRef | null>;
  position: number;
  setPosition: (position: number) => void;
  selection: Selection;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export const usePlayer = (): PlayerContextValue => {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used within a PlayerProvider');
  return value;
};
