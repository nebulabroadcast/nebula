import clsx from 'clsx';
import './InputSwitch.css';

interface InputSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const InputSwitch = ({
  style,
  className,
  value,
  onChange,
  disabled,
}: InputSwitchProps) => (
  <div style={style} className={clsx('nb-switch', className, { disabled })}>
    <label className="switch-body">
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={() => {
          onChange(!value);
        }}
      />
      <span className="slider"></span>
    </label>
  </div>
);
InputSwitch.displayName = 'InputSwitch';
