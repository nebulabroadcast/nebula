import styled from 'styled-components'
import defaultTheme from './theme'

const BaseSwitch = styled.div`
  max-height: ${(props) => props.theme.inputHeight};
  min-height: ${(props) => props.theme.inputHeight};
  display: flex;
  flex-direction: row;
  align-items: center;
  outline: 1px solid red;

  label {
    --bheight: ${(props) => props.theme.inputHeight * 0.7};
    --bwidth: calc(var(--bheight) * 1.75 );
    position: relative;
    display: inline-block;
    height: var(--bheight);
    width: var(--bwidth);

    input{
      opacity: 0;
      width: 0;
      height: 0;
    }

    input:checked + .slider{
      background-color: ${(props) => props.theme.colors.cyan};
    }

    input:checked + .slider:before {
      transform: translateX(calc(var(--bheight) * .8));
    }

    span {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${(props) => props.theme.colors.surface05};
      transition: .4s;
      border-radius: calc(var(--bheight) / 2):

      &:before {
        position: absolute;
        content: "";
        height: calc(var(--bheight) * .8);
        width: calc(var(--bheight) * .8);
        left: calc(var(--bheight) * .1);
        bottom: calc(var(--bheight) * .1);
        background-color: ${(props) => props.theme.colors.surface03};
        transition: .4s;
        border-radius: 50%;
      }
    }
  }
`
BaseSwitch.defaultProps = {
  theme: defaultTheme,
}

const Switch = ({ style, className, ...props }) => {
  return (
    <BaseSwitch style={style} className={className}>
      <label>
        <input type="checkbox" {...props} />
        <span />
      </label>
    </BaseSwitch>
  )
}

export default Switch
