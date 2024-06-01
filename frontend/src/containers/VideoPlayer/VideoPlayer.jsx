import { AudioContextProvider } from './AudioContext'
import { VideoPlayerBody } from './VideoPlayerBody'

const VideoPlayer = (props) => {
  const audioChannels = 2

  return (
    <AudioContextProvider numChannels={audioChannels}>
      <VideoPlayerBody {...props} />
    </AudioContextProvider>
  )
}

export default VideoPlayer
