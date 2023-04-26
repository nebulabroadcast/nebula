import styled from 'styled-components'
import defaultTheme from './theme'
import { forwardRef } from 'react'

const BaseButton = styled.button`
  border: 0;
  border-radius: ${(props) => props.theme.inputBorderRadius};
  background: ${(props) => props.theme.inputBackground};
  color: ${(props) => props.theme.colors.text};
  font-size: ${(props) => props.theme.fontSize};
  padding-left: ${(props) => props.theme.inputPadding};
  padding-right: ${(props) => props.theme.inputPadding};
  min-height: ${(props) => props.theme.inputHeight};
  max-height: ${(props) => props.theme.inputHeight};
  min-width: ${(props) => props.theme.inputHeight} !important;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  white-space: nowrap;

  &:focus {
    background: ${(props) => props.theme.colors.surface06};
    outline: 1px solid ${(props) => props.theme.colors.cyan};
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
    outline: 1px solid ${(props) => props.theme.colors.highlight};
  }

  &:disabled {
    cursor: not-allowed;
    background: ${(props) => props.theme.colors.surface03};
    color: ${(props) => props.theme.colors.surface08};
  }
`
BaseButton.defaultProps = {
  theme: defaultTheme,
}

const Button = forwardRef(
  (
    { icon, iconStyle, label, iconOnRight, active, className, ...props },
    ref
  ) => {
    const classes = className ? [className] : []
    if (active) {
      classes.push('active')
    }

    return (
      <BaseButton {...props} className={classes.join(' ')} ref={ref}>
        {iconOnRight && label}
        {icon && (
          <span className="icon material-symbols-outlined" style={iconStyle}>
            {icon}
          </span>
        )}
        {!iconOnRight && label}
      </BaseButton>
    )
  }
)

export default Button
