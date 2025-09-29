import Input from './Input.styled';

const InputNumber = ({ value, onChange, tooltip, ...props }) => {
  return (
    <Input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      title={tooltip}
      {...props}
    />
  );
};

export default InputNumber;
