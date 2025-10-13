import styled from 'styled-components';

import { getTheme } from './theme';
import { dateToDateString } from './lib/datetime';
import { dateToTimeString } from './lib/datetime';

const TimestampWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  // dimmed date part
  color: ${getTheme().colors.textDim};

  > span:last-child {
    color: ${getTheme().colors.text};
  }
`;

interface TimestampProps extends React.HTMLAttributes<HTMLDivElement> {
  timestamp: number; // Unix timestamp in seconds
  mode?: 'date' | 'time'; // Show only date or only time
}

const Timestamp = ({ timestamp, mode, ...props }:TimestampProps) => {
  // Timestamp component to display a unix timestamp in a human-readable format.
  if (!timestamp) return <></>;
  // const localDateTime = typeof date === 'string' ? new Date(date) : date;
  const localDateTime = new Date(timestamp * 1000);
  const dateStr = dateToDateString(localDateTime);
  const timeStr = dateToTimeString(localDateTime);

  return (
    <TimestampWrapper {...props}>
      {!(mode === 'time') && <span>{dateStr}</span>}
      {!(mode === 'date') && <span>{timeStr}</span>}
    </TimestampWrapper>
  );
};

export default Timestamp;
