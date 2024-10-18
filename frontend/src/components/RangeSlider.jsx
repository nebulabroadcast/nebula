import { forwardRef } from 'react'
import styled from 'styled-components'
import defaultTheme from './theme'

const StyledRange = styled.input`
  border: 0;
  border-radius: ${(props) => props.theme.inputBorderRadius};
  background: ${(props) => props.theme.inputBackground};

  -webkit-appearance: none;
  appearance: none;
  background: transparent;

  cursor: pointer;
  width: 150px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${(props) => props.theme.colors.surface08};
  }

  &::-webkit-slider-runnable-track {
    width: 100%;
    cursor: pointer;
    background: ${(props) => props.theme.colors.surface04};
    border-radius: 8px;
  }
`

StyledRange.defaultProps = {
  theme: defaultTheme,
  type: 'range',
}

const RangeSlider = forwardRef((props, ref) => {
  return <StyledRange ref={ref} type="range" {...props} />
})

export default RangeSlider
