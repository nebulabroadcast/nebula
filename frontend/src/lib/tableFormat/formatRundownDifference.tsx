import { TableRowData } from '@components/table/types';
import { Timecode } from '@wfoxall/timeframe';

// fps: frame rate of the rundown's playout channel
const formatRundownDifference =
  (fps: number) => (rowData: TableRowData, _key: string) => {
    const scheduled = (rowData.scheduled_time as number) || 0;
    const broadcast = (rowData.broadcast_time as number) || 0;
    const diff = scheduled - broadcast;

    const formattedDiff = new Timecode(Math.round(Math.abs(diff) * fps), fps)
      .toString()
      .substring(0, 11);

    const style: React.CSSProperties = {};

    if (diff > 0) style.color = 'red';
    else style.color = 'green';

    return <td style={style}>{formattedDiff}</td>;
  };

export default formatRundownDifference;
