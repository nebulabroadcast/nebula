import clsx from 'clsx';
import { forwardRef } from 'react';
import './Input.css';

interface InputTextProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  tooltip?: string;
  style?: React.CSSProperties;
  className?: string;
  readOnly?: boolean;
  onDoubleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const InputText = forwardRef<HTMLInputElement, InputTextProps>(
  (props: InputTextProps, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (props.onChange) {
        props.onChange(e.target.value);
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        value={props.value || ''}
        data-tooltip={props.tooltip}
        placeholder={props.placeholder}
        disabled={props.disabled}
        readOnly={props.readOnly}
        onChange={handleChange}
        onDoubleClick={props.onDoubleClick}
        onKeyDown={props.onKeyDown}
        style={props.style}
        className={clsx('nb-input', props.className)}
      />
    );
  }
);
InputText.displayName = 'InputText';
