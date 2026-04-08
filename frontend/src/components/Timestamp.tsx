import { dateToDateString } from './lib/datetime';
import { dateToTimeString } from './lib/datetime';

import './Timestamp.css';

interface TimestampProps extends React.HTMLAttributes<HTMLDivElement> {
  timestamp: number; // Unix timestamp in seconds
  mode?: 'date' | 'time' | 'datetime'; // Show only date or only time
}

const Timestamp = ({ timestamp, mode = 'datetime', ...props }: TimestampProps) => {
  // Timestamp component to display a unix timestamp in a human-readable format.
  if (!timestamp) return <></>;
  // const localDateTime = typeof date === 'string' ? new Date(date) : date;
  const localDateTime = new Date(timestamp * 1000);
  const dateStr = dateToDateString(localDateTime);
  const timeStr = dateToTimeString(localDateTime);

  return (
    <div className="nb-timestamp" {...props}>
      {!(mode === 'time') && <span>{dateStr}</span>}
      {!(mode === 'date') && <span>{timeStr}</span>}
    </div>
  );
};

export default Timestamp;
