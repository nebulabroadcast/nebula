import BaseInput from './BaseInput'

const InputInteger = ({ value, onChange, ...props }) => {
  return (
    <BaseInput
      type="number"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

export default InputInteger
