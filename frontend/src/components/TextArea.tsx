import clsx from 'clsx';
import React from 'react';

import './Input.css';

interface TextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  tooltip?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  tooltip,
  ...props
}) => {
  return (
    <textarea
      className={clsx('nb-input', 'textarea')}
      data-tooltip={tooltip}
      value={value || ''}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      {...props}
    />
  );
};
TextArea.displayName = 'TextArea';
