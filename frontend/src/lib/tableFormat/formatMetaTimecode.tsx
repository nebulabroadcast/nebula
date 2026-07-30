import { TableRowData } from '@components/table/types';
import { Timecode } from '@wfoxall/timeframe';

const formatMetaTimecode = (rowData: TableRowData, key: string) => {
  const duration = (rowData[key] as number) || 0;
  if (!duration) return <td></td>;

  const fps = (rowData['video/fps_f'] as number) || 25;
  const timecode = new Timecode(duration * fps, fps);
  return <td>{timecode.toString().substring(0, 11)}</td>;
};

export default formatMetaTimecode;
