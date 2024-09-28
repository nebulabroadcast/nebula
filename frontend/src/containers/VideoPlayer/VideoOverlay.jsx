import React, { useEffect, useRef } from 'react'

const VideoOverlay = ({ videoWidth, videoHeight, showOverlay }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const drawOverlay = () => {
      const width = canvas.width
      const height = canvas.height

      // Clear the canvas
      ctx.clearRect(0, 0, width, height)

      if (!showOverlay) return

      // Draw safe area indicator
      const safeMargin = 0.05 // 5% margin
      ctx.setLineDash([])
      ctx.strokeStyle = '#cccccc'
      ctx.lineWidth = 1
      ctx.strokeRect(
        width * safeMargin,
        height * safeMargin,
        width * (1 - 2 * safeMargin),
        height * (1 - 2 * safeMargin)
      )

      // Draw center cross
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = '#cccccc'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(width / 2, 0)
      ctx.lineTo(width / 2, height)
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()
    }

    drawOverlay()
  }, [videoWidth, videoHeight, showOverlay])

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth}
      height={videoHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  )
}

export default VideoOverlay
