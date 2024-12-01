import styled from 'styled-components'
import PropTypes from 'prop-types'
import defaultTheme from './theme'
import { forwardRef } from 'react'
import clsx from 'clsx'

const BaseButton = styled.button`
  border: 0;
  border-radius: ${(props) => props.theme.inputBorderRadius};
  background: ${(props) => props.theme.inputBackground};
  color: ${(props) => props.theme.colors.text};
  font-size: ${(props) => props.theme.fontSize};
  padding-left: 12px;
  padding-right: 12px;
  min-height: ${(props) => props.theme.inputHeight};
  max-height: ${(props) => props.theme.inputHeight};
  min-width: ${(props) => props.theme.inputHeight} !important;

  &.icon-only {
    padding: 0;
    min-width: ${(props) => props.theme.inputHeight};
    max-width: ${(props) => props.theme.inputHeight};
    min-height: ${(props) => props.theme.inputHeight};
    max-height: ${(props) => props.theme.inputHeight};
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
    background: ${(props) => props.theme.colors.surface06};
    outline: 0;
  }

  &:hover {
    background: ${(props) => props.theme.colors.surface06};
    color: ${(props) => props.theme.colors.text};
  }

  &:invalid,
  &.error {
    outline: 1px solid ${(props) => props.theme.colors.red} !important;
  }

  &.active {
    background: ${(props) => props.theme.colors.surface06};
    text-shadow: 0 0 4px ${(props) => props.theme.colors.highlight};
  }

  &:disabled {
    cursor: not-allowed;
    background: ${(props) => props.theme.colors.surface03};
    color: ${(props) => props.theme.colors.surface08};
    transition: background 0.2s, color 0.2s;
  }
`
BaseButton.defaultProps = {
  theme: defaultTheme,
}

const Button = forwardRef(
  (
    {
      icon,
      iconStyle,
      label,
      iconOnRight,
      active,
      className,
      tooltip,
      hlColor,
      ...props
    },
    ref
  ) => {
    const _iconStyle = { ...(iconStyle || {}) }

    if (hlColor) {
      _iconStyle.color = hlColor
    }

    return (
      <BaseButton
        {...props}
        className={clsx(className, { active }, !label && 'icon-only')}
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
Button.defaultProps = {
  iconOnRight: false,
  //component: 'button',
}

Button.propTypes = {
  icon: PropTypes.string,
  label: PropTypes.string,
  iconOnRight: PropTypes.bool,
  active: PropTypes.bool,
  className: PropTypes.string,
  //component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
}

export default Button
