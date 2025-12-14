import React, { useState, useMemo } from 'react';
import styled from 'styled-components';

import Button from './Button';
import InputText from './InputText';
import SelectDialog, { SelectOption } from './SelectDialog';
import { getTheme } from './theme';

// ... (rest of the styled-components definitions)
const DialogBasedSelect = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  min-width: 200px;

  .scroll-box {
    flex-grow: 1;
    position: relative;

    .scroll-box-cont {
      position: relative;
      max-height: 400px;
      overflow-y: scroll;
      overflow-x: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
  }
`;

const StyledHTMLSelect = styled.select`
  border: 0;
  border-radius: ${getTheme().inputBorderRadius};
  background: ${getTheme().inputBackground};
  color: ${getTheme().colors.text};
  min-height: ${getTheme().inputHeight};
  font-size: ${getTheme().fontSize};
  padding-left: ${getTheme().inputPadding};
  padding-right: ${getTheme().inputPadding};
  min-width: 200px;

  &:focus {
    outline: 1px solid ${getTheme().colors.cyan};
  }

  &:hover {
    color: ${getTheme().colors.text};
  }

  &:disabled {
    cursor: not-allowed;
    background: ${getTheme().colors.surface03};
    color: ${getTheme().colors.surface08};
  }

  &:invalid,
  &.error {
    outline: 1px solid ${getTheme().colors.red} !important;
  }
`;

interface SelectProps {
  options: SelectOption[];
  value?: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  selectionMode?: 'single' | 'multiple';
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  style,
  disabled,
  selectionMode = 'single',
}) => {
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);

  const displayValue = useMemo(() => {
    if (!value) return '';
    const result: string[] = [];
    for (const opt of options) {
      if (selectionMode === 'single' && value === opt.value) {
        result.push(opt.title);
        break;
      } else if (
        Array.isArray(value) &&
        selectionMode === 'multiple' &&
        value.includes(opt.value)
      ) {
        result.push(opt.title);
      }
    }
    return result.join(', ');
  }, [options, value, selectionMode]);

  const onDialogClose = (newValue: string | string[] | null) => {
    onChange(newValue);
    setDialogVisible(false);
  };

  const dialog = useMemo(() => {
    if (!dialogVisible) return null;
    return (
      <SelectDialog
        options={options}
        selectionMode={selectionMode}
        initialValue={value}
        onHide={onDialogClose}
      />
    );
  }, [dialogVisible, options, selectionMode, value, onDialogClose]);

  if (selectionMode === 'single' && options.length < 20) {
    return (
      <StyledHTMLSelect
        value={(value as string) || ''}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          onChange(e.target.value || null);
        }}
        style={style}
        disabled={disabled}
      >
        <option value={''}></option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.title}
          </option>
        ))}
      </StyledHTMLSelect>
    );
  }

  return (
    <DialogBasedSelect style={style}>
      {dialog}
      <InputText
        value={displayValue}
        placeholder={placeholder}
        readOnly={true}
        disabled={disabled}
        style={{ flexGrow: 1 }}
        onDoubleClick={() => {
          if (disabled) return;
          setDialogVisible(true);
        }}
        onChange={() => {}}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') setDialogVisible(true);
        }}
      />
      <Button label="..." onClick={() => setDialogVisible(true)} disabled={disabled} />
    </DialogBasedSelect>
  );
};

export default Select;
