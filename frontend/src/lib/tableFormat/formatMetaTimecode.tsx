import { Timecode } from '@wfoxall/timeframe';
import { TableRowData } from '@components/table/types';

const formatMetaTimecode = (rowData: TableRowData, key: string) => {
  let duration = (rowData[key] as number) || 0;
  if (!duration) return <td></td>;

  const fps = (rowData['video/fps_f'] as number) || 25;
  const timecode = new Timecode(duration * fps, fps);
  return <td>{timecode.toString().substring(0, 11)}</td>;
};

export default formatMetaTimecode;
