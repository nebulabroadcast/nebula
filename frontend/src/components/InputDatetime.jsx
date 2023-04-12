import {useState, useEffect, useRef } from 'react'
import BaseInput from './BaseInput'
import { DateTime } from 'luxon'

const timeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
const allowedDateCharsRegex = /^[\d-\:\ ]*$/

const InputDatetime = ({ value, onChange, placeholder, className = '' }) => {
  const [time, setTime] = useState()
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!value) {
      setTime('')
      return
    }

    setTime(DateTime.fromSeconds(value).toFormat('yyyy-MM-dd HH:mm:ss'))
  }, [value])

  const handleChange = (event) => {
    let newValue = event.target.value
    if (!allowedDateCharsRegex.test(newValue)) return

    // if the original value ended with a dash and the new value removes this dash,
    // so it is one byte shorter than the original value, we need to remove the dash
    // as well as the last character of the new value

    if (time && time.length - 1 === newValue.length && time.endsWith('-')) {
      newValue = newValue.slice(0, -1)
    } else if (
      [4, 7].includes(newValue.length) &&
      newValue.charAt(newValue.length - 1) !== '-'
    )
      newValue = newValue + '-'
    setTime(newValue)
  }

  const isValidTime = (timeString) => {
    if (!timeString) return true

    if (timeRegex.test(timeString))
      if (!isNaN(DateTime.fromFormat(timeString, 'yyyy-MM-dd HH:mm:ss')))
        return true
    return false
  }

  const onSubmit = () => {
    let value = 0

    if (dateRegex.test(time)) {
      setTime(time + ' 00:00:00')
      return
    }

    if (time && isValidTime(time)) {
      value = DateTime.fromFormat(time, 'yyyy-MM-dd HH:mm:ss').toSeconds()
    }
    onChange(value)
    inputRef.current.blur()
    setIsFocused(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSubmit()
    }
  }

  return (
    <BaseInput
      type="text"
      ref={inputRef}
      value={time || ''}
      onChange={handleChange}
      className={`${className} ${!isValidTime(time) ? 'error' : ''}`}
      placeholder={
        isFocused
          ? 'YYYY-MM-DD HH:MM:SS  (Hit enter after the date for midnight)'
          : placeholder
      }
      title="Please enter a valid time in the format yyyy-mm-dd hh:mm:ss"
      onBlur={onSubmit}
      onFocus={(e) => {
        e.target.select(), setIsFocused(true)
      }}
      onKeyDown={onKeyDown}
    />
  )
}

export default InputDatetime
