import React from 'react';

import { AudioContextProvider } from './AudioContext';
import { VideoPlayerProps } from './types';
import { VideoPlayerBody } from './VideoPlayerBody';

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
  const audioChannels = 2;

  return (
    <AudioContextProvider numChannels={audioChannels}>
      <VideoPlayerBody {...props} />
    </AudioContextProvider>
  );
};

export default VideoPlayer;
