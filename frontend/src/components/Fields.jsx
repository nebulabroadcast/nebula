import defaultTheme from './theme'
import styled from 'styled-components'

const DateTime = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  font-size: 0.9rem;
  > span:first-child {
    color: ${(props) => props.theme.colors.textDim};
  }
`

const Timestamp = ({ timestamp, mode, ...props }) => {
  if (!timestamp) return <></>
  const localDateTime = new Date(timestamp * 1000)

  // Get the local timezone
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Format the local date and time
  // Using swedish locale, because it's the sane one. Thanks, swedes!
  const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: localTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const timeFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: localTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const localDate = dateFormatter.format(localDateTime)
  const localTime = timeFormatter.format(localDateTime)

  return (
    <DateTime {...props}>
      <span>{localDate}</span>
      {!(mode === "date") && <span>{localTime}</span>}
    </DateTime>
  )
}
Timestamp.defaultProps = {
  theme: defaultTheme,
}

export { DateTime, Timestamp }
