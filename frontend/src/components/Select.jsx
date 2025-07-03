import { useState, useMemo } from 'react';
import styled from 'styled-components';

import Button from './Button';
import InputText from './InputText';
import SelectDialog from './SelectDialog';
import { getTheme } from './theme';

// Styled dialog-based select component.

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

// When there is just a few items in the list, we can use a dropdown.
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

const Select = ({
  options,
  value,
  onChange,
  placeholder,
  style,
  disabled,
  selectionMode = 'single',
}) => {
  const [dialogVisible, setDialogVisible] = useState(false);

  const displayValue = useMemo(() => {
    let result = [];
    if (!value) return;
    for (const opt of options) {
      if (selectionMode === 'single' && value === opt.value) {
        result.push(opt.title);
        break;
      } else if (selectionMode === 'multiple' && value.includes(opt.value))
        result.push(opt.title);
    }
    return result.join(', ');
  }, [options, value]);

  const onDialogClose = (value) => {
    onChange(value);
    setDialogVisible(false);
  };

  let dialog = useMemo(() => {
    if (!dialogVisible) return <></>;
    return (
      <SelectDialog
        options={options}
        selectionMode={selectionMode}
        initialValue={value}
        onHide={onDialogClose}
      />
    );
  }, [dialogVisible]);

  if (selectionMode === 'single' && options.length < 20) {
    return (
      <StyledHTMLSelect
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value || null);
        }}
        style={style}
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
        onKeyDown={(e) => {
          if (e.key === 'Enter') setDialogVisible(true);
        }}
      />
      <Button label="..." onClick={() => setDialogVisible(true)} disabled={disabled} />
    </DialogBasedSelect>
  );
};

export default Select;
