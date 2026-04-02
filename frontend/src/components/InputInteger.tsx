import './Input.css';

interface InputIntegerProps {
  value: number | null;
  onChange: (value: number | null) => void;
  tooltip?: string;
  [key: string]: any;
}

export const InputInteger = ({
  value,
  onChange,
  tooltip,
  ...props
}: InputIntegerProps) => {
  return (
    <input
      type="number"
      className="nb-input"
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
InputInteger.displayName = 'InputInteger';
