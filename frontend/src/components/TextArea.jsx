import Input from './Input.styled';

const TextArea = ({ value, onChange, tooltip, ...props }) => {
  return (
    <Input
      as="textarea"
      className="textarea"
      title={tooltip}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
};

export default TextArea;
