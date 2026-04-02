import clsx from 'clsx';

import { Button } from './Button';

import './RadioButton.css';

interface RadioButtonProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  disabled?: boolean;
  options: Array<{
    value: string;
    title: string;
    icon?: string;
    description?: string;
    buttonStyle?: React.CSSProperties;
  }>;
}

const RadioButton = ({
  options,
  value,
  onChange,
  disabled,
  style,
}: RadioButtonProps) => {
  return (
    <div className="nb-radio-button-group" style={style}>
      {options.map((option) => (
        <Button
          key={option.value}
          onClick={() => {
            onChange(option.value);
          }}
          className={clsx({ active: option.value === value })}
          icon={option.icon}
          label={option.title}
          tooltip={option.description}
          style={option.buttonStyle}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default RadioButton;
