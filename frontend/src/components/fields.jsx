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

const Timestamp = ({ timestamp, ...props }) => {
  const date = new Date(timestamp * 1000)
  const [dd, tt] = date.toISOString().slice(0, 19).split('T')
  return (
    <DateTime {...props}>
      <span>{dd}</span>
      <span>{tt}</span>
    </DateTime>
  )
}
Timestamp.defaultProps = {
  theme: defaultTheme,
}

export { DateTime, Timestamp }
