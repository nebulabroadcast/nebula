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
  readOnly?: boolean;
  onDoubleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const InputText = forwardRef<HTMLInputElement, InputTextProps>(
  (props: InputTextProps, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        value={props.value || ''}
        data-tooltip={props.tooltip}
        placeholder={props.placeholder}
        disabled={props.disabled}
        readOnly={props.readOnly}
        onChange={(e) => props.onChange(e.target.value)}
        onDoubleClick={props.onDoubleClick}
        onKeyDown={props.onKeyDown}
        style={props.style}
        className={props.className}
      />
    );
  }
);
InputText.displayName = 'InputText';

export default InputText;
