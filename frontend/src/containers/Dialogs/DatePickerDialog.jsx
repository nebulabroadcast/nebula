import styled from 'styled-components'
import { useState, useEffect } from 'react'
import { Dialog, Button } from '/src/components'
import DatePicker from 'react-datepicker'
import { DateTime } from 'luxon'

const DatePickerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 200px;
  min-height: 250px;
`

const DatePickerDialog = (props) => {
  const [value, setValue] = useState()
  const onCancel = () => props.handleCancel()
  const onConfirm = () => {
    const t = value.toFormat('yyyy-MM-dd')
    props.handleConfirm(t)
  }

  useEffect(() => {
    const date = DateTime.fromFormat(props.value, 'yyyy-MM-dd')
    setValue(date)
  }, [props.value])

  const footer = (
    <>
      <Button
        onClick={onCancel}
        label={props.cancelLabel || 'Cancel'}
        icon="close"
        hlColor="var(--color-red)"
      />
      <Button
        onClick={onConfirm}
        label={props.confirmLabel || 'Confirm'}
        icon="check"
        hlColor="var(--color-green)"
      />
    </>
  )

  return (
    <Dialog onHide={onCancel} header={props.title} footer={footer}>
      <DatePickerWrapper>
        {value && (
          <DatePicker
            calendarStartDay={1}
            selected={value.toJSDate()}
            onChange={(date) => setValue(DateTime.fromJSDate(date))}
            inline
          />
        )}
      </DatePickerWrapper>
    </Dialog>
  )
}

export default DatePickerDialog
