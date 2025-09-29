import Input from './Input.styled';

const InputInteger = ({ value, onChange, tooltip, ...props }) => {
  return (
    <Input
      type="number"
      value={value || ''}
      title={tooltip}
      onChange={(e) => {
        if (e.target.value === '') onChange(null);
        else onChange(e.target.value);
      }}
      {...props}
    />
  );
};

export default InputInteger;
