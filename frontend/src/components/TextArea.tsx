import React from 'react';
import Input from './Input.styled';

interface TextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  tooltip?: string;
}

const TextArea: React.FC<TextAreaProps> = ({ value, onChange, tooltip, ...props }) => {
  return (
    <Input
      as="textarea"
      className="textarea"
      title={tooltip}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
};

export default TextArea;
