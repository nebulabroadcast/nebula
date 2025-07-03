import styled from 'styled-components';

import { getTheme } from './theme';

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

  const yy = localDateTime.getFullYear();
  const mm = localDateTime.getMonth() + 1; // Months are zero-based
  const dd = localDateTime.getDate();

  const hh = localDateTime.getHours();
  const min = localDateTime.getMinutes();
  const ss = localDateTime.getSeconds();

  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${yy}-${pad(mm)}-${pad(dd)}`;
  const timeStr = `${hh}:${pad(min)}:${pad(ss)}`;

  return (
    <TimestampWrapper {...props}>
      {!(mode === 'time') && <span>{dateStr}</span>}
      {!(mode === 'date') && <span>{timeStr}</span>}
    </TimestampWrapper>
  );
};

export default Timestamp;
