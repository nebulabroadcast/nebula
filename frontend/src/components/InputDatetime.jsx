import {useState, useEffect, useRef } from 'react'
import { DateTime } from 'luxon'
import styled from 'styled-components'

import { DialogButtons } from './layout'
import DatePicker from 'react-datepicker'
import Dialog from './Dialog'

import BaseInput from './BaseInput'
import Button from './Button'

//import "react-datepicker/dist/react-datepicker.css"

import './datepicker.sass'

const timeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
const allowedDateCharsRegex = /^[\d-\:\ ]*$/


const DateTimeWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  min-width: 200px;
`

const DatePickerWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`


const CalendarDialog = ({ value, onChange, onClose }) => {

  // get current timestamp
  const defaultDate = DateTime.local().toSeconds()

  const [date, setDate] = useState(DateTime.fromSeconds(value || defaultDate))


  return (
    <Dialog onHide={onClose}>
      <DatePickerWrapper>
      <DatePicker
        locale="sv-SE"
        calendarStartDay={1}
        selected={date.toJSDate()}
        onChange={(date) => {
          setDate(DateTime.fromJSDate(date))
        }}
        inline
        />
      </DatePickerWrapper>
      <DialogButtons>
        <Button 
          label="Cancel"
          icon="close"
          onClick={onClose}
        />
        <Button 
          icon="check"
          label="Apply"
          onClick={() => {
            const newDate = date.set({ hour: 0, minute: 0, second: 0 })
            onChange(newDate.toSeconds())
            onClose()
          }} 
        />
      </DialogButtons>
    </Dialog>
  )
}




const InputDatetime = ({ value, onChange, placeholder, className = '' }) => {
  const [time, setTime] = useState()
  const [isFocused, setIsFocused] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
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
    <DateTimeWrapper>
    {showCalendar && (
      <CalendarDialog value={value} onChange={onChange} onClose={() => setShowCalendar(false)} />
    )}
    <BaseInput
      type="text"
      ref={inputRef}
      value={time || ''}
      onChange={handleChange}
      style={{ flexGrow: 1 }}
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
      <Button icon="calendar_today" onClick={() => setShowCalendar(true)} />
    </DateTimeWrapper>
  )
}

export default InputDatetime
