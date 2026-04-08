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
    const ctx = new window.AudioContext();
    setAudioContext(ctx);
    return () => {
      if (mediaElementSourceRef.current) {
        mediaElementSourceRef.current.disconnect();
        mediaElementSourceRef.current = null;
      }
      if (splitterRef.current) {
        splitterRef.current.disconnect();
        splitterRef.current = null;
      }
      ctx.close().catch(console.error);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !audioContext) return;

    if (!mediaElementSourceRef.current) {
      mediaElementSourceRef.current = audioContext.createMediaElementSource(video);
    }

    video.onplay = () => {
      audioContext.resume();
    };

    return () => {
      if (video) video.onplay = null;
    };
  }, [audioContext, videoRef.current]);

  useEffect(() => {
    if (!audioContext || !mediaElementSourceRef.current) return;

    if (numChannels) {
      // Cleanup old nodes to prevent leaks and overlaps
      if (gainNodes.length) {
        gainNodes.forEach((node) => node.disconnect());
      }
      if (splitterRef.current) {
        splitterRef.current.disconnect();
      }

      // Create new splitter and connect media source
      const splitter = audioContext.createChannelSplitter(numChannels);
      splitterRef.current = splitter;

      mediaElementSourceRef.current.disconnect();
      mediaElementSourceRef.current.connect(splitter);

      // Create new gain nodes for each channel
      const newGainNodes: GainNode[] = [];
      for (let i = 0; i < numChannels; i++) {
        const gainNode = audioContext.createGain();
        newGainNodes.push(gainNode);
        splitter.connect(gainNode, i);
        gainNode.connect(audioContext.destination);
      }
      setGainNodes(newGainNodes);
    }
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
