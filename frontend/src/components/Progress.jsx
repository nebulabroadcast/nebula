import styled from 'styled-components'
import defaultTheme from './theme'

const BaseProgress = styled.div`
  width: 100%;
  border: 0;
  border-radius: ${(props) => props.theme.inputBorderRadius};
  background: ${(props) => props.theme.inputBackground};
  height: 10px;

  div {
    height: 100%;
    transition: width 0.3s linear;
    background: ${(props) => props.theme.colors.cyan};
  }
`
BaseProgress.defaultProps = {
  theme: defaultTheme,
}

const Progress = ({ value, ...props }) => {
  return (
    <BaseProgress {...props}>
      <div style={{ width: `${value}%` }} />
    </BaseProgress>
  )
}

export default Progress
