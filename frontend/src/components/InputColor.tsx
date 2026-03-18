import { useMemo } from 'react';
import styled from 'styled-components';

import Input from './Input.styled';

const BaseColorInput = styled(Input)`
  width: 30px;
`;

const COLOR_PRESETS = [
  '#dc8a78',
  '#dd7878',
  '#ea76cb',
  '#8839ef',
  '#d20f39',
  '#e64553',
  '#fe640b',
  '#df8e1d',
  '#40a02b',
  '#179299',
  '#04a5e5',
  '#209fb5',
  '#1e66f5',
  '#7287fd',
  '#4c4f69',
];

interface InputColorProps {
  value: number;
  onChange: (value: number) => void;
  tooltip?: string;
  disabled?: boolean;
}

const InputColor = ({ value, onChange, tooltip, disabled }: InputColorProps) => {
  // Nebula stores color as integer so we need to convert it to hex

  const hexValue = useMemo(() => {
    if (!value) return '#7287fd';
    return `#${value.toString(16).padStart(6, '0')}`.slice(0, 7);
  }, [value]);

  const setColor = (hex: string) => {
    if (!hex) return null;
    onChange(parseInt(hex.slice(1), 16));
  };

  return (
    <>
      <BaseColorInput
        type="color"
        value={hexValue}
        data-tooltip={tooltip}
        list="presetColors"
        onChange={(e) => setColor(e.target.value)}
        disabled={disabled}
      />
      <datalist id="presetColors">
        {COLOR_PRESETS.map((color) => (
          <option key={color} value={color} />
        ))}
      </datalist>
    </>
  );
};

export default InputColor;
