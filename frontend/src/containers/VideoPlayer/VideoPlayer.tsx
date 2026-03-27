import React from 'react';
import { AudioContextProvider } from './AudioContext';
import { VideoPlayerBody } from './VideoPlayerBody';
import { VideoPlayerProps } from './types';

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
  const audioChannels = 2;

  return (
    <AudioContextProvider numChannels={audioChannels}>
      <VideoPlayerBody {...props} />
    </AudioContextProvider>
  );
};

export default VideoPlayer;
