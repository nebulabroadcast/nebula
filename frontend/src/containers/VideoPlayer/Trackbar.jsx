import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, Navbar } from '/src/components'

const Trackbar = ({
  videoDuration,
  currentTime,
  onScrub,
  markIn,
  markOut,
  bufferedRanges,
}) => {
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  // DRAW

  const drawSlider = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const width = ctx.canvas.width
    const height = ctx.canvas.height

    // Clear the canvas
    ctx.clearRect(0, 0, width, height)

    // Draw the background of the slider
    ctx.fillStyle = '#19161f'
    ctx.fillRect(0, 0, width, height)

    // Draw the buffered ranges
    for (const range of bufferedRanges) {
      const start = (range.start / videoDuration) * width
      const end = (range.end / videoDuration) * width
      ctx.strokeStyle = '#885bff'
      ctx.beginPath()
      ctx.moveTo(start, 0)
      ctx.lineTo(end, 0)
      ctx.stroke()
    }

    let markInX = 0
    if (markIn) {
      markInX = (markIn / videoDuration) * width
      ctx.strokeStyle = 'green'
      ctx.beginPath()
      ctx.moveTo(markInX, 0)
      ctx.lineTo(markInX, height)
      ctx.stroke()
    }

    let markOutX = width
    if (markOut) {
      markOutX = (markOut / videoDuration) * width
      ctx.strokeStyle = 'red'
      ctx.beginPath()
      ctx.moveTo(markOutX, 0)
      ctx.lineTo(markOutX, height)
      ctx.stroke()
    }

    ctx.strokeStyle = markOutX > markInX ? '#0ed3fe' : 'red'
    ctx.beginPath()
    ctx.moveTo(markInX, height - 1)
    ctx.lineTo(markOutX, height - 1)
    ctx.stroke()

    // Draw the handle
    const progressWidth = (currentTime / videoDuration) * width
    ctx.fillStyle = '#0ed3fe'
    ctx.beginPath()
    ctx.fillRect(progressWidth - 1, 0, 2, height)
    ctx.fill()
  }, [currentTime, videoDuration, markIn, markOut])

  // Events

  useEffect(() => {
    drawSlider()
  }, [currentTime, videoDuration, markIn, markOut])

  // Dragging

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = (x / rect.width) * videoDuration
    onScrub(newTime)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleMouseDown = (e) => {
    setIsDragging(true)
    handleMouseMove(e)
  }

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    console.log(rect)
    console.log(e.clientX, rect.left)
    const x = e.clientX - rect.left
    const newTime = (x / rect.width) * videoDuration
    onScrub(newTime)
  }

  return (
    <Navbar>
      <Canvas
        ref={canvasRef}
        style={{ minHeight: 42, maxHeight: 42, cursor: 'pointer', flexGrow: 1 }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDraw={drawSlider}
      />
    </Navbar>
  )
}

export default Trackbar
