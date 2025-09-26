import { forwardRef } from 'react';

import Input from './Input.styled';

const InputPassword = forwardRef(({ value, onChange, tooltip, ...props }, ref) => {
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
});
InputPassword.displayName = 'InputPassword';

export default InputPassword;
