import { useMemo } from 'react'
import styled from 'styled-components'
import defaultTheme from './theme'
import BaseInput from './BaseInput'

const BaseColorInput = styled(BaseInput)`
  width: 30px;
`

const InputColor = ({ value, onChange, tooltip, ...props }) => {
  /*
  Nebula stores color as integer so we need to convert it to hex
  */

  const hexValue = useMemo(() => {
    if (!value) return '#885bff'
    const hval = `#${value.toString(16).padStart(6, '0')}`
    console.log('hexValue', value, '->', hval)
    return hval
  }, [value])

  const setColor = (hex) => {
    if (!hex) return null
    const intVal = parseInt(hex.slice(1), 16)
    console.log('setColor', hex, '->', intVal)
    onChange(intVal)
  }

  const presetColors = useMemo(() => {
    return Object.keys(defaultTheme.colors)
      .filter(
        (color) => !(color.startsWith('surface') || color.startsWith('text'))
      )
      .map((color) => defaultTheme[color])
  }, [])

  return (
    <>
      <BaseColorInput
        type="color"
        value={hexValue}
        title={tooltip}
        list="presetColors"
        onChange={(e) => setColor(e.target.value)}
        {...props}
      />
      <datalist id="presetColors">
        {presetColors.map((color) => (
          <option key={color} value={color} />
        ))}
      </datalist>
    </>
  )
}

export default InputColor
