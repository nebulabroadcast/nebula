import { useEffect } from 'react'
import RDatePicker from 'react-datepicker'
import styled from 'styled-components'
import defaultTheme from './theme'

import './datepicker.sass'

const PickerContainer = styled.div`

  input {
  border: 0;
  border-radius: ${(props) => props.theme.inputBorderRadius};
  background: ${(props) => props.theme.inputBackground};
  color: ${(props) => props.theme.colors.text};
  font-size: ${(props) => props.theme.fontSize};
  min-height: ${(props) => props.theme.inputHeight};
  max-height: ${(props) => props.theme.inputHeight};
  font-size: ${(props) => props.theme.fontSize};
  padding-left: ${(props) => props.theme.inputPadding};
  padding-right: ${(props) => props.theme.inputPadding};
  padding-top: 0;
  padding-bottom: 0;
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
`
PickerContainer.defaultProps = {
  theme: defaultTheme,
}

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = ('0' + (date.getMonth() + 1)).slice(-2)
  const day = ('0' + date.getDate()).slice(-2)
  return `${year}-${month}-${day}`
}

const DatePicker = ({ value, onChange }) => {
  useEffect(() => {
    if (!value) {
      const newValue = formatDate(new Date())
      onChange(newValue)
    }
  }, [value])

  const onSelectDate = (date) => {
    onChange(formatDate(date))
  }

  return (
    <PickerContainer>
      <RDatePicker
        dateFormat="d. MMMM, yyyy"
        locale="cs-CZ"
        calendarStartDay={1}
        selected={value ? new Date(value) : null}
        onChange={onSelectDate}
      />
    </PickerContainer>
  )
}

export default DatePicker
