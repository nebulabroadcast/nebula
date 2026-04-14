import React, { forwardRef } from 'react';

import { AudioContextProvider } from './AudioContext';
import { VideoPlayerProps, VideoPlayerRef } from './types';
import { VideoPlayerBody } from './VideoPlayerBody';

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>((props, ref) => {
  const audioChannels = 2;

  return (
    <AudioContextProvider numChannels={audioChannels}>
      <VideoPlayerBody {...props} ref={ref} />
    </AudioContextProvider>
  );
});

export default VideoPlayer;
