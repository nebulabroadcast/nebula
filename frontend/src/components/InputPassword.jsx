import BaseInput from './BaseInput'

const InputPassword = ({ value, onChange, ...props }) => {
  return (
    <BaseInput
      type="password"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

export default InputPassword
