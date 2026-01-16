import React, { forwardRef } from 'react';

import Input from './Input.styled';

interface InputPasswordProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  tooltip?: string;
}

const InputPassword = forwardRef<HTMLInputElement, InputPasswordProps>(
  ({ value, onChange, tooltip, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="password"
        title={tooltip}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    );
  }
);
InputPassword.displayName = 'InputPassword';

export default InputPassword;
