import { Timecode } from '@wfoxall/timeframe'

import { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import defaultTheme from './theme'

const Input = styled.input`
  border: 0;
  border-radius: ${(props) => props.theme.inputBorderRadius};
  background: ${(props) => props.theme.inputBackground};
  color: ${(props) => props.theme.colors.text};
  min-height: ${(props) => props.theme.inputHeight};
  font-size: ${(props) => props.theme.fontSize};
  padding-left: ${(props) => props.theme.inputPadding};
  padding-right: ${(props) => props.theme.inputPadding};
  min-width: 200px;

  &:-webkit-autofill,
  &:-webkit-autofill:focus {
    transition: background-color 600000s 0s, color 600000s 0s;
  }

  &:focus {
    outline: 1px solid ${(props) => props.theme.colors.cyan};
  }

  &:hover {
    color: ${(props) => props.theme.colors.text};
  }

  &:invalid,
  &.error {
    outline: 1px solid ${(props) => props.theme.colors.red} !important;
  }

  &:read-only {
    font-style: italic;
  }

  &.timecode {
    min-width: 92px;
    max-width: 92px;
    padding-right: 10px !important;
    text-align: right;
    font-family: monospace;
  }

  &.textarea {
    padding: ${(props) => props.theme.inputPadding};
    min-height: 60px;
    resize: vertical;
  }
`
Input.defaultProps = {
  theme: defaultTheme,
}

const InputText = ({ value, onChange, ...props }) => {
  return (
    <Input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

const InputNumber = ({ value, onChange, ...props }) => {
  return (
    <Input
      type="text"
      value={value || null}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

const InputPassword = ({ value, onChange, ...props }) => {
  return (
    <Input
      type="password"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

const TextArea = ({ value, onChange, ...props }) => {
  return (
    <Input
      as="textarea"
      className="textarea"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

const InputTimecode = ({
  value = null,
  fps = 25,
  onChange = () => {},
  tooltip = null,
  className = null,
  ...props
}) => {
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setInvalid(false)
    if (value === null || value === undefined) {
      setText('')
      return
    }
    const tc = new Timecode(value * fps, fps)
    let str = tc.toString()
    str = str.replace(/;/g, ':')
    str = str.substring(0, 11)
    setText(str)
  }, [value])

  const onChangeHandler = (e) => {
    let res = e.target.value
    res = res.replace(/[^0-9:]/g, '')
    if (res.length > 11) {
      res = text
    } else {
      res = res.replace(/[^0-9]/g, '')
      if (res.length > 2) res = res.slice(0, -2) + ':' + res.slice(-2)
      if (res.length > 5) res = res.slice(0, -5) + ':' + res.slice(-5)
      if (res.length > 8) res = res.slice(0, -8) + ':' + res.slice(-8)
    }
    setText(res)
  }

  const onSubmit = () => {
    // add zero padding to the timecode
    if (!text) {
      setInvalid(false)
      onChange(null)
      return
    }

    let str = text
    str = str.replaceAll(':', '')
    str = str.padStart(8, '0')
    str = str.replace(/([0-9]{2})/g, '$1:')
    str = str.slice(0, -1)

    try {
      const tcobj = new Timecode(str, fps)
      setInvalid(false)
      setText(str)
      onChange(tcobj.frames / fps)
    } catch (e) {
      setInvalid(true)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSubmit()
      inputRef.current.blur()
    }
  }

  return (
    <Input
      type="text"
      ref={inputRef}
      className={`timecode ${className} ${invalid ? 'error' : ''}`}
      value={text}
      onChange={onChangeHandler}
      onKeyDown={onKeyDown}
      onBlur={onSubmit}
      onFocus={(e) => e.target.select()}
      placeholder="--:--:--:--"
      title={tooltip}
      {...props}
    />
  )
}

export { TextArea, InputTimecode, InputText, InputNumber, InputPassword }
