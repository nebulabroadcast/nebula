import BaseInput from './BaseInput'

const TextArea = ({ value, onChange, ...props }) => {
  return (
    <BaseInput
      as="textarea"
      className="textarea"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

export default TextArea
