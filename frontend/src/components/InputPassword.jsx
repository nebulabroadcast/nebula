import { forwardRef } from 'react'
import BaseInput from './BaseInput'

const InputPassword = forwardRef(({ value, onChange, ...props }, ref) => {
  return (
    <BaseInput
      ref={ref}
      type="password"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
})

export default InputPassword
