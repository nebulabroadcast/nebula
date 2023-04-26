import { forwardRef } from 'react'
import BaseInput from './BaseInput'

const InputText = forwardRef(({ value, onChange, ...props }, ref) => {
  return (
    <BaseInput
      ref={ref}
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
})

export default InputText
