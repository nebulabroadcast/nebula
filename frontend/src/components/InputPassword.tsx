import clsx from 'clsx';
import React, { forwardRef } from 'react';

import './Input.css';

interface InputPasswordProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  onChange: (value: string) => void;
  tooltip?: string;
}

export const InputPassword = forwardRef<HTMLInputElement, InputPasswordProps>(
  ({ value, onChange, tooltip, className, ...props }, ref) => (
    <input
      ref={ref}
      type="password"
      className={clsx('nb-input', className)}
      data-tooltip={tooltip}
      value={value || ''}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      {...props}
    />
  )
);
InputPassword.displayName = 'InputPassword';
