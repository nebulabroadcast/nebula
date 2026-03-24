import Input from './Input.styled';

interface InputNumberProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  tooltip?: string;
}

const InputNumber = ({ value, onChange, tooltip }: InputNumberProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
    } else if (!isNaN(Number(val))) {
      onChange(Number(val));
    }
  };

  return (
    <Input
      type="number"
      value={value || ''}
      onChange={handleChange}
      data-tooltip={tooltip}
    />
  );
};

export default InputNumber;
