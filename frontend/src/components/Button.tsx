import clsx from 'clsx';
import { forwardRef } from 'react';
import { BaseButton } from './Button.styled';

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
