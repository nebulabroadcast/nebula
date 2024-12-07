import styled from 'styled-components'
import PropTypes from 'prop-types'
import { getTheme } from './theme'
import { forwardRef } from 'react'
import clsx from 'clsx'

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
    transition: background 0.2s, color 0.2s;
  }
`

const Button = forwardRef(
  (
    {
      icon,
      iconStyle,
      label,
      active,
      className,
      tooltip,
      hlColor,
      style,
      iconOnRight = false,
      ...props
    },
    ref
  ) => {
    const _buttonStyle = { ...(style || {}) }
    const _iconStyle = { ...(iconStyle || {}) }

    if (hlColor) {
      //_iconStyle.color = hlColor
      _buttonStyle.borderBottom = `1px solid ${hlColor}`
    }

    return (
      <BaseButton
        {...props}
        className={clsx(className, { active }, !label && 'icon-only')}
        style={_buttonStyle}
        title={tooltip}
        ref={ref}
      >
        {label && iconOnRight && <span>{label}</span>}
        {icon && (
          <span className="icon material-symbols-outlined" style={_iconStyle}>
            {icon}
          </span>
        )}
        {!iconOnRight && label && <span>{label}</span>}
      </BaseButton>
    )
  }
)

Button.displayName = 'Button'

Button.propTypes = {
  icon: PropTypes.string,
  label: PropTypes.string,
  iconOnRight: PropTypes.bool,
  active: PropTypes.bool,
  className: PropTypes.string,
  //component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
}

export default Button
