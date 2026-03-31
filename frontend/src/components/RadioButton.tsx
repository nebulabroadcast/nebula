import clsx from 'clsx';
import styled from 'styled-components';

import Button from './Button';

const RadioContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0;

  button {
    border-radius: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 1px solid #161616 !important;
    flex-grow: 1 !important;

    &:first-child {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
    }

    &:last-child {
      border-right: 0;
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }
  }
`;

interface RadioButtonProps {
  options: Array<{
    value: string;
    title: string;
    icon?: string;
    description?: string;
    buttonStyle?: React.CSSProperties;
  }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const RadioButton = ({ options, value, onChange, disabled }: RadioButtonProps) => {
  return (
    <RadioContainer>
      {options.map((option) => (
        <Button
          key={option.value}
          onClick={() => {
            onChange(option.value);
          }}
          className={clsx({ active: option.value === value })}
          icon={option.icon}
          label={option.title}
          tooltip={option.description}
          style={option.buttonStyle}
          disabled={disabled}
        />
      ))}
    </RadioContainer>
  );
};

export default RadioButton;
