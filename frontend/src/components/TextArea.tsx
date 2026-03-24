import React from 'react';
import styled from 'styled-components';

import { InputStyle } from './Input.styled';

const StyledTextArea = styled.textarea`
  ${InputStyle}
`;

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
    <StyledTextArea
      className="textarea"
      data-tooltip={tooltip}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
};

export default TextArea;
