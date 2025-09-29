import { forwardRef } from 'react';

import Input from './Input.styled';

const InputText = forwardRef(({ value, onChange, tooltip, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      type="text"
      value={value || ''}
      title={tooltip}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
});
InputText.displayName = 'InputText';

export default InputText;
