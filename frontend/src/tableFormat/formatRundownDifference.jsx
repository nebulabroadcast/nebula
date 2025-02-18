import { Timecode } from '@wfoxall/timeframe';

const formatRundownDifference = (rowData, key) => {
  const scheduled = rowData['scheduled_time'];
  const broadcast = rowData['broadcast_time'];
  const diff = scheduled - broadcast;

  const formattedDiff = new Timecode(Math.abs(diff) * 25, 25)
    .toString()
    .substring(0, 11);

  const style = {};

  if (diff > 0) style.color = 'red';
  else style.color = 'green';

  return <td style={style}>{formattedDiff}</td>;
};

export default formatRundownDifference;
