import Input from './Input.styled';

interface InputIntegerProps {
  value: number | null;
  onChange: (value: number | null) => void;
  tooltip?: string;
  [key: string]: any;
}

const InputInteger = ({ value, onChange, tooltip, ...props }: InputIntegerProps) => {
  return (
    <Input
      type="number"
      value={value || ''}
      data-tooltip={tooltip}
      onChange={(e) => {
        if (e.target.value === '') onChange(null);
        else onChange(e.target.value ? parseInt(e.target.value, 10) : null);
      }}
      {...props}
    />
  );
};

export default InputInteger;
