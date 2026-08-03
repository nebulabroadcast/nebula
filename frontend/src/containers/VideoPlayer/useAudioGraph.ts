import { useEffect, useState } from 'react';

export interface AudioGraph {
  audioContext: AudioContext | null;
  /** Node the player engine feeds decoded audio into */
  inputNode: AudioNode | null;
  /** Per channel gain nodes, used by the channel select and the VU meters */
  gainNodes: GainNode[];
  /** Called by the engine when the channel count of the media is known */
  setChannelCount: (channels: number) => void;
}

/**
 * Web Audio graph of the player:
 *
 *   engine -> input -> splitter -> gain (per channel) -> destination
 *
 * The graph is rebuilt whenever the media changes its channel count, so the
 * number of faders and VU meters always matches the actual audio.
 */
export const useAudioGraph = (): AudioGraph => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [inputNode, setInputNode] = useState<AudioNode | null>(null);
  const [gainNodes, setGainNodes] = useState<GainNode[]>([]);
  const [channelCount, setChannelCount] = useState(0);

  useEffect(() => {
    const context = new window.AudioContext();
    setAudioContext(context);
    return () => {
      void context.close();
    };
  }, []);

  useEffect(() => {
    if (!audioContext || !channelCount) {
      setInputNode(null);
      setGainNodes([]);
      return;
    }

    const input = audioContext.createGain();
    // keep every channel of the source separate all the way to the faders
    input.channelCount = channelCount;
    input.channelCountMode = 'explicit';
    input.channelInterpretation = 'discrete';

    const splitter = audioContext.createChannelSplitter(channelCount);
    input.connect(splitter);

    const nodes: GainNode[] = [];
    for (let i = 0; i < channelCount; i++) {
      const gainNode = audioContext.createGain();
      splitter.connect(gainNode, i);
      gainNode.connect(audioContext.destination);
      nodes.push(gainNode);
    }

    setInputNode(input);
    setGainNodes(nodes);

    return () => {
      nodes.forEach((node) => {
        node.disconnect();
      });
      splitter.disconnect();
      input.disconnect();
    };
  }, [audioContext, channelCount]);

  return { audioContext, inputNode, gainNodes, setChannelCount };
};
