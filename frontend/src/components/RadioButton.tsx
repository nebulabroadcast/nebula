import clsx from 'clsx';
import styled from 'styled-components';

import Button from './Button';

const RadioContainer = styled.div`
  display: flex;
  gap: 0;

  button {
    border-radius: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 1px solid #161616 !important;
    flex-grow: 1;

    &:first-child {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
    }

    &:last-child {
      border-right: 0;
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }

`;

interface RadioButtonProps {
  options: {
    value: string;
    title: string;
    icon?: string;
    tooltip?: string;
    buttonStyle?: React.CSSProperties;
  }[];
  value: string;
  onChange: (value: string) => void;
}

const RadioButton = ({ options, value, onChange }: RadioButtonProps) => {
  return (
    <RadioContainer>
      {options.map((option) => (
        <Button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={clsx({ active: option.value === value })}
          icon={option.icon}
          label={option.title}
          tooltip={option.tooltip}
          style={option.buttonStyle}
        />
      ))}
    </RadioContainer>
  );
};

export default RadioButton;
