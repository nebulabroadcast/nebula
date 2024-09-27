const ZoomControl = ({ zoom, setZoom }) => {
  return (
    <input
      type="range"
      min="1"
      max="5"
      step=".4"
      onChange={(e) => setZoom(e.target.value)}
      value={zoom}
    />
  )
}

export default ZoomControl
