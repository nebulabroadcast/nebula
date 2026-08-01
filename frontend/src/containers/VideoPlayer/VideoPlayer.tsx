import { forwardRef } from 'react';

import { VideoPlayerProps, VideoPlayerRef } from './types';
import { VideoPlayerBody } from './VideoPlayerBody';

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>((props, ref) => {
  return <VideoPlayerBody {...props} ref={ref} />;
});

export default VideoPlayer;
