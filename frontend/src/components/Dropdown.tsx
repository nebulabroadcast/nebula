import clsx from 'clsx';

import Button from './Button';
import { DropdownContainer } from './Dropdown.styled.tsx';

export interface DropdownOptionProps {
  currentValue?: any;
  separator?: boolean;
  disabled?: boolean;
  hlColor?: string;
  style?: React.CSSProperties;
  label: string;
  icon?: string;
  onClick: (value: any) => void;
  value?: any;
}

const DropdownOption = ({
  currentValue,
  separator,
  disabled,
  hlColor,
  style,
  label,
  icon,
  onClick,
  value,
}: DropdownOptionProps) => {
  return (
    <span>
      {separator && <hr />}
      <Button
        label={label}
        icon={icon}
        style={style}
        iconStyle={hlColor ? { color: hlColor } : {}}
        disabled={disabled || currentValue === value}
        onClick={() => onClick(value)}
        active={currentValue === value}
      />
    </span>
  );
};

interface DropdownProps {
  options: DropdownOptionProps[];
  label?: string;
  icon?: string;
  align?: 'left' | 'right';
  buttonStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  value?: any;
  disabled?: boolean;
  iconOnRight?: boolean;
}

const Dropdown = ({
  options,
  label,
  icon = 'expand_more',
  align = 'left',
  buttonStyle = {},
  contentStyle = {},
  value = null,
  disabled = false,
  iconOnRight = true,
}: DropdownProps) => {
  if (align === 'right') contentStyle['right'] = 0;

  return (
    <DropdownContainer className={clsx({ disabled })}>
      <Button
        className="dropbtn"
        style={buttonStyle}
        icon={icon}
        label={label}
        iconOnRight={iconOnRight}
        disabled={disabled}
      />
      <div className="dropdown-content" style={contentStyle}>
        {options &&
          options.map((option, idx) => (
            <DropdownOption
              key={idx}
              currentValue={value}
              value={option.value}
              label={option.label}
              icon={option.icon}
              separator={option.separator}
              disabled={option.disabled}
              hlColor={option.hlColor}
              style={option.style}
              onClick={option.onClick}
            />
          ))}
      </div>
    </DropdownContainer>
  );
};

export default Dropdown;
