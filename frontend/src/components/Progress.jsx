import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { getTheme } from './theme'

const BaseProgress = styled.div`
  width: 100%;
  border: 0;
  border-radius: ${getTheme().inputBorderRadius};
  background: ${getTheme().inputBackground};
  height: 10px;

  div {
    height: 100%;
    background: ${getTheme().colors.cyan};
    border-radius: ${getTheme().inputBorderRadius};
    transition: ${(props) =>
      props.disableTransition ? 'none' : 'width 0.3s linear'};
  }
`

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
        className="progress"
        style={{ width: `${value}%` }}
        key={disableTransition ? 'no-transition' : 'transition'}
      />
    </BaseProgress>
  )
}

export default Progress
