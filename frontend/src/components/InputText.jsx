import { forwardRef } from 'react'
import BaseInput from './BaseInput'

const InputText = forwardRef(({ value, onChange, tooltip, ...props }, ref) => {
  return (
    <BaseInput
      ref={ref}
      type="text"
      value={value || ''}
      title={tooltip}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
})
InputText.displayName = 'InputText'

export default InputText
