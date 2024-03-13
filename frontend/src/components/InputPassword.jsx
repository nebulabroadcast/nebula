import { forwardRef } from 'react'
import BaseInput from './BaseInput'

const InputPassword = forwardRef(
  ({ value, onChange, tooltip, ...props }, ref) => {
    return (
      <BaseInput
        ref={ref}
        type="password"
        title={tooltip}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    )
  }
)

export default InputPassword
