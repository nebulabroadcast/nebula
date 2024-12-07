import clsx from 'clsx'
import styled from 'styled-components'
import { getTheme } from './theme'

const BaseSwitch = ({ style, className, value, onChange, disabled }) => (
  <div style={style} className={clsx(className, { disabled })}>
    <label className="switch-body">
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={() => onChange(!value)}
      />
      <span className="slider"></span>
    </label>
  </div>
)

const InputSwitch = styled(BaseSwitch)`
  max-height: ${getTheme().inputHeight};
  min-height: ${getTheme().inputHeight};
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;

  --bheight: calc(${getTheme().inputHeight} * 0.7);

  &.small {
    --bheight: calc(${getTheme().inputHeight} * 0.5);
    min-height: 0;
  }
  --bwidth: calc(var(--bheight) * 1.75);

  &.disabled {
    .slider {
      cursor: not-allowed !important;
      background: ${getTheme().colors.surface04} !important;

      &:before {
        background: ${getTheme().colors.surface07} !important;
      }
    }
  }

  .switch-body {
    position: relative;
    display: inline-block;
    height: var(--bheight);
    width: var(--bwidth);

    input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    input:checked + .slider {
      background-color: ${getTheme().colors.cyan};
    }

    input:checked + .slider:before {
      transform: translateX(calc(var(--bheight) * 0.8));
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${getTheme().colors.surface04};
      transition: 0.4s;
      border-radius: calc(var(--bheight) / 2);

      &:before {
        position: absolute;
        content: '';
        height: calc(var(--bheight) * 0.8);
        width: calc(var(--bheight) * 0.8);
        left: calc(var(--bheight) * 0.1);
        bottom: calc(var(--bheight) * 0.1);
        background-color: ${getTheme().colors.textHl};
        transition: 0.4s;
        border-radius: 50%;
        z-index: 1;
      }
    }
  }
`

export default InputSwitch
