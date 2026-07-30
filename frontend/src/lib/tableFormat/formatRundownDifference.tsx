import { TableRowData } from '@components/table/types';
import { Timecode } from '@wfoxall/timeframe';

const formatRundownDifference = (rowData: TableRowData, _key: string) => {
  const scheduled = (rowData.scheduled_time as number) || 0;
  const broadcast = (rowData.broadcast_time as number) || 0;
  const diff = scheduled - broadcast;

  const formattedDiff = new Timecode(Math.abs(diff) * 25, 25)
    .toString()
    .substring(0, 11);

  const style: React.CSSProperties = {};

  if (diff > 0) style.color = 'red';
  else style.color = 'green';

  return <td style={style}>{formattedDiff}</td>;
};

export default formatRundownDifference;
