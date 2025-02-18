import styled from 'styled-components';
import { getTheme } from './theme';
import { forwardRef } from 'react';
import clsx from 'clsx';

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
    font-size: 1.4rem;
  }

  &:focus {
    background: ${getTheme().colors.surface06};
    outline: 0;
  }

  &:hover {
    background: ${getTheme().colors.surface06};
    color: ${getTheme().colors.text};
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
  const _buttonStyle = { ...(props.style || {}) };
  const _iconStyle = { ...(props.iconStyle || {}) };

  if (props.hlColor) {
    _buttonStyle.borderBottom = `1px solid ${props.hlColor}`;
  }

  return (
    <BaseButton
      className={clsx(
        props.className,
        props.active && 'active',
        !props.label && 'icon-only'
      )}
      style={_buttonStyle}
      title={props.tooltip}
      ref={ref}
      {...props}
    >
      {props.label && props.iconOnRight && <span>{props.label}</span>}
      {props.icon && (
        <span className="icon material-symbols-outlined" style={_iconStyle}>
          {props.icon}
        </span>
      )}
      {!props.iconOnRight && props.label && <span>{props.label}</span>}
    </BaseButton>
  );
});

Button.displayName = 'Button';
export default Button;
