import { createContext, useContext, useEffect, useRef, useState } from 'react'

const AudioContextContext = createContext(null)

export const useAudioContext = () => {
  return useContext(AudioContextContext)
}

export const AudioContextProvider = ({ numChannels, children }) => {
  const [audioContext, setAudioContext] = useState(null)
  const [gainNodes, setGainNodes] = useState([])

  const splitterRef = useRef(null)
  const mediaElementSourceRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    if (audioContext) return
    setAudioContext(new window.AudioContext())
  }, [audioContext])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!audioContext) return

    if (mediaElementSourceRef.current) {
      mediaElementSourceRef.current.disconnect()
    }

    mediaElementSourceRef.current = audioContext.createMediaElementSource(video)

    video.onplay = () => {
      audioContext.resume()
    }

    return () => {
      video.onplay = null
      audioContext.close()
    }
  }, [videoRef, audioContext])

  useEffect(() => {
    if (!audioContext) return

    if (gainNodes.length) {
      gainNodes.forEach((gainNode) => {
        gainNode.disconnect()
      })
    }

    if (!splitterRef.current && numChannels) {
      splitterRef.current = audioContext.createChannelSplitter(numChannels)
      mediaElementSourceRef.current.connect(splitterRef.current)
    }

    const newGainNodes = []
    for (let i = 0; i < numChannels; i++) {
      const gainNode = audioContext.createGain()
      newGainNodes.push(gainNode)
      splitterRef.current.connect(gainNode, i)
      gainNode.connect(audioContext.destination)
    }
    setGainNodes(newGainNodes)
  }, [audioContext, numChannels])

  const ctx = {
    audioContext,
    videoRef,
    gainNodes,
    numChannels,
  }

  return (
    <AudioContextContext.Provider value={ctx}>
      {children}
    </AudioContextContext.Provider>
  )
}
