import clsx from 'clsx';
import React, { forwardRef } from 'react';
import './Button.css';

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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props: ButtonProps, ref) => {
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

    const _buttonStyle = { ...style };
    const _iconStyle = { ...iconStyle };

    if (hlColor && !buttonProps.disabled) {
      _iconStyle.color = props.hlColor;
    }

    return (
      <button
        className={clsx(
          'nb-button',
          className,
          active && 'active',
          !label && 'icon-only'
        )}
        style={_buttonStyle}
        data-tooltip={tooltip}
        ref={ref}
        {...buttonProps}
      >
        {label && iconOnRight && <span>{label}</span>}
        {icon && (
          <span
            className="icon material-symbols-outlined"
            style={_iconStyle}
            translate="no"
          >
            {icon}
          </span>
        )}
        {!iconOnRight && label && <span>{label}</span>}
      </button>
    );
  }
);
