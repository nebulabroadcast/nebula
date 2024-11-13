import { useState, useEffect } from 'react'
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
    background: ${(props) => props.theme.colors.cyan};
    border-radius: ${(props) => props.theme.inputBorderRadius};
    transition: ${(props) =>
      props.disableTransition ? 'none' : 'width 0.3s linear'};
  }
`
BaseProgress.defaultProps = {
  theme: defaultTheme,
}

const Progress = ({ value, ...props }) => {
  const [prevValue, setPrevValue] = useState(value)
  const [disableTransition, setDisableTransition] = useState(false)

  useEffect(() => {
    if (value < prevValue) {
      setDisableTransition(true)
    } else {
      setDisableTransition(false)
    }
    setPrevValue(value)
  }, [value, prevValue])

  return (
    <BaseProgress {...props} disableTransition={disableTransition}>
      <div
        style={{ width: `${value}%` }}
        key={disableTransition ? 'no-transition' : 'transition'}
      />
    </BaseProgress>
  )
}

export default Progress
