import clsx from 'clsx';
import { forwardRef } from 'react';
import styled from 'styled-components';

import { getTheme } from './theme';

const BaseButton = styled.button`
  border: 0;
  border-radius: ${getTheme().inputBorderRadius};
  background: ${getTheme().inputBackground};
  color: ${getTheme().colors.text};
  font-size: ${getTheme().fontSize};
  padding-left: 12px;
  padding-right: 12px;
  min-height: ${getTheme().inputHeight};
  max-height: ${getTheme().inputHeight};
  min-width: ${getTheme().inputHeight} !important;

  &.icon-only {
    padding: 0;
    min-width: ${getTheme().inputHeight};
    max-width: ${getTheme().inputHeight};
    min-height: ${getTheme().inputHeight};
    max-height: ${getTheme().inputHeight};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  user-select: none;
  user-drag: none;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap;

  .icon {
    font-size: 20px;
    padding-top: 2px;
  }

  &:focus {
    background: ${getTheme().colors.surface06};
    outline: 0;
  }

  &:hover {
    background: ${getTheme().colors.surface06};
    color: ${getTheme().colors.text};
    text-decoration: none; // when rendered as a
  }

  &:invalid,
  &.error {
    outline: 1px solid ${getTheme().colors.red} !important;
  }

  &.active {
    background: ${getTheme().colors.surface06};
    text-shadow: 0 0 4px ${getTheme().colors.highlight};
  }

  &:disabled {
    cursor: not-allowed;
    background: ${getTheme().colors.surface03};
    color: ${getTheme().colors.surface08};
    transition:
      background 0.2s,
      color 0.2s;
  }
`;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  iconStyle?: React.CSSProperties;
  label?: string;
  active?: boolean;
  className?: string;
  tooltip?: string;
  hlColor?: string;
  style?: React.CSSProperties;
  iconOnRight?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>((props: ButtonProps, ref) => {
  const {
    hlColor,
    style,
    icon,
    iconStyle,
    className,
    label,
    active,
    tooltip,
    iconOnRight,
    ...buttonProps
  } = props;

  const _buttonStyle = style || {};
  const _iconStyle = iconStyle || {};

  if (hlColor && !buttonProps.disabled) {
    //_buttonStyle.borderBottom = `1px solid ${props.hlColor}`;
    _iconStyle.color = props.hlColor;
  }

  return (
    <BaseButton
      className={clsx(className, active && 'active', !label && 'icon-only')}
      style={_buttonStyle}
      title={tooltip}
      ref={ref}
      {...buttonProps}
    >
      {label && iconOnRight && <span>{label}</span>}
      {icon && (
        <span className="icon material-symbols-outlined" style={_iconStyle}>
          {icon}
        </span>
      )}
      {!iconOnRight && label && <span>{label}</span>}
    </BaseButton>
  );
});

Button.displayName = 'Button';
export default Button;
