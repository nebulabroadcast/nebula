import BaseInput from './BaseInput'

const InputNumber = ({ value, onChange, tooltip, ...props }) => {
  return (
    <BaseInput
      type="number"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      title={tooltip}
      {...props}
    />
  )
}

export default InputNumber
