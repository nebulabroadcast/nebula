import { useState, useEffect, useRef } from 'react'
import { Timecode } from '@wfoxall/timeframe'
import BaseInput from './BaseInput'
import clsx from 'clsx'

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
    if (value === null || value === undefined || isNaN(value)) {
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
    e.stopPropagation()
  }

  return (
    <BaseInput
      type="text"
      ref={inputRef}
      className={clsx('timecode', className, {error: invalid})}
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

export default InputTimecode
