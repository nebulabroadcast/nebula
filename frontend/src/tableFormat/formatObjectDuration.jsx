import { Timecode } from '@wfoxall/timeframe'

const formatObjectDuration = (rowData, key) => {
  if (rowData.run_mode === 4) {
    return (
      <td>
        <hr />
      </td>
    )
  }

  if (rowData.item_role === 'lead_in' || rowData.item_role === 'lead_out') {
    return (
      <td>
        <hr />
      </td>
    )
  }

  const fps = rowData['video/fps_f'] || 25
  let duration = rowData[key] || 0
  if (rowData.mark_out) duration = rowData.mark_out
  if (rowData.mark_in) duration -= rowData.mark_in
  const trimmed = duration < rowData.duration
  const timecode = new Timecode(duration * fps, fps)
  const title =
    trimmed && `Original duration ${new Timecode(rowData.duration * fps, fps)}`
  return (
    <td title={title || ''}>
      {timecode.toString().substring(0, 11)}
      {trimmed && '*'}
    </td>
  )
}

export default formatObjectDuration
