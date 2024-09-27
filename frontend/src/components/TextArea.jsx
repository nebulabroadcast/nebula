import BaseInput from './BaseInput'

const TextArea = ({ value, onChange, tooltip, ...props }) => {
  return (
    <BaseInput
      as="textarea"
      className="textarea"
      title={tooltip}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

export default TextArea
