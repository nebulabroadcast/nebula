import { Timecode } from '@wfoxall/timeframe';

const formatMetaTimecode = (rowData, key) => {
  let duration = rowData[key] || 0;
  if (!duration) return <td></td>;

  const fps = rowData['video/fps_f'] || 25;
  const timecode = new Timecode(duration * fps, fps);
  return <td>{timecode.toString().substring(0, 11)}</td>;
};

export default formatMetaTimecode;
