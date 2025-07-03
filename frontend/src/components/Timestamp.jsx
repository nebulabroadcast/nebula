import styled from 'styled-components';

import { getTheme } from './theme';
import { dateToDateString } from '/src/utils';
import { dateToTimeString } from '/src/utils';

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

const Timestamp = ({ timestamp, mode, ...props }) => {
  if (!timestamp) return <></>;
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
