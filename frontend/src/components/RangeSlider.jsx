import { forwardRef } from 'react'
import styled from 'styled-components'
import { getTheme } from './theme'

const StyledRange = styled.input`
  border: 0;
  border-radius: ${getTheme().inputBorderRadius};
  background: ${getTheme().inputBackground};

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
    background: ${getTheme().colors.surface08};
  }

  &::-webkit-slider-runnable-track {
    width: 100%;
    cursor: pointer;
    background: ${getTheme().colors.surface04};
    border-radius: 8px;
  }
`

const RangeSlider = forwardRef((props, ref) => {
  return <StyledRange ref={ref} type="range" {...props} />
})

RangeSlider.displayName = 'RangeSlider'

export default RangeSlider
