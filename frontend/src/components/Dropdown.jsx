import Button from './Button'
import styled from 'styled-components'
import clsx from 'clsx'

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;

  .dropdown-content {
    display: none;
    position: absolute;
    background-color: var(--color-surface-02);
    min-width: 100px;
    box-shadow: 4px 4px 10px 4px rgba(0, 0, 0, 0.7);
    z-index: 5;

    hr {
      margin: 0;
      border: none;
      border-top: 2px solid var(--color-surface-03);
    }

    button {
      background: none;
      width: 100%;
      justify-content: flex-start;
      border-radius: 0;
      padding: 25px 8px;

      &:hover {
        background-color: var(--color-surface-04);
      }

      &:active,
      &:focus {
        outline: none !important;
      }

      &:disabled {
        color: var(--color-text-dim);
      }
    }
  }

  > button {
    // background: none;
    // border: none;
    // border-radius: 0;
    padding: 0 8px;
    justify-content: space-between;

    &:active,
    &:focus {
      outline: none !important;
    }
  }

  &:not(.disabled):hover .dropdown-content {
    display: block;
  }
`

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
}) => {
  return (
    <span>
      {separator && <hr />}
      <Button
        label={label}
        icon={icon}
        iconStyle={hlColor ? { color: hlColor } : {}}
        disabled={disabled || currentValue === value}
        onClick={() => onClick(value)}
      />
    </span>
  )
}

const Dropdown = ({
  options,
  label = null,
  icon = 'expand_more',
  align = 'left',
  buttonStyle = {},
  contentStyle = {},
  value = null,
  disabled = false,
  defaultValue = null,
}) => {
  if (align === 'right') contentStyle['right'] = 0

  return (
    <DropdownContainer className={clsx({ disabled })}>
      <Button
        className="dropbtn"
        style={buttonStyle}
        icon={icon}
        label={label}
        iconOnRight={true}
        disabled={disabled}
      />
      <div className="dropdown-content" style={contentStyle}>
        {options &&
          options.map((option, idx) => (
            <DropdownOption key={idx} currentValue={value} {...option} />
          ))}
      </div>
    </DropdownContainer>
  )
}

export default Dropdown
