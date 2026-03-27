import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface AudioContextContextType {
  audioContext: AudioContext | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  gainNodes: GainNode[];
  numChannels: number;
}

const AudioContextContext = createContext<AudioContextContextType | null>(null);

export const useAudioContext = () => {
  const context = useContext(AudioContextContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioContextProvider');
  }
  return context;
};

interface AudioContextProviderProps {
  numChannels: number;
  children: React.ReactNode;
}

export const AudioContextProvider: React.FC<AudioContextProviderProps> = ({
  numChannels,
  children,
}) => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [gainNodes, setGainNodes] = useState<GainNode[]>([]);

  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (audioContext) return;
    setAudioContext(new window.AudioContext());
  }, [audioContext]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !audioContext) return;

    if (mediaElementSourceRef.current) {
      mediaElementSourceRef.current.disconnect();
    }

    mediaElementSourceRef.current = audioContext.createMediaElementSource(video);

    video.onplay = () => {
      audioContext.resume();
    };

    return () => {
      if (video) video.onplay = null;
    };
  }, [audioContext]);

  useEffect(() => {
    if (!audioContext || !mediaElementSourceRef.current) return;

    if (gainNodes.length) {
      gainNodes.forEach((gainNode) => {
        gainNode.disconnect();
      });
    }

    if (!splitterRef.current && numChannels) {
      splitterRef.current = audioContext.createChannelSplitter(numChannels);
      mediaElementSourceRef.current.connect(splitterRef.current);
    }

    const newGainNodes: GainNode[] = [];
    if (splitterRef.current) {
      for (let i = 0; i < numChannels; i++) {
        const gainNode = audioContext.createGain();
        newGainNodes.push(gainNode);
        splitterRef.current.connect(gainNode, i);
        gainNode.connect(audioContext.destination);
      }
    }
    setGainNodes(newGainNodes);
  }, [audioContext, numChannels]);

  const ctx: AudioContextContextType = {
    audioContext,
    videoRef,
    gainNodes,
    numChannels,
  };

  return (
    <AudioContextContext.Provider value={ctx}>{children}</AudioContextContext.Provider>
  );
};
