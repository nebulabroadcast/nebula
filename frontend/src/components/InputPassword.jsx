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
InputPassword.displayName = 'InputPassword'

export default InputPassword
