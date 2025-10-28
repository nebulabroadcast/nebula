import clsx from 'clsx';

import { BaseSwitch } from './InputSwitch.styled';

interface InputSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const InputSwitch = ({
  style,
  className,
  value,
  onChange,
  disabled,
}: InputSwitchProps) => (
  <BaseSwitch style={style} className={clsx(className, { disabled })}>
    <label className="switch-body">
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={() => onChange(!value)}
      />
      <span className="slider"></span>
    </label>
  </BaseSwitch>
);

export default InputSwitch;
