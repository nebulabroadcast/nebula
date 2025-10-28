import { forwardRef } from 'react';

import Input from './Input.styled';

interface InputTextProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  tooltip?: string;
  style?: React.CSSProperties;
  className?: string;
}

const InputText = forwardRef<HTMLInputElement, InputTextProps>(
  (props: InputTextProps, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        value={props.value || ''}
        title={props.tooltip}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        style={props.style}
        className={props.className}
      />
    );
  }
);
InputText.displayName = 'InputText';

export default InputText;
