import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';

import Button from './Button';
import InputText from './InputText';
import SelectDialog, { SelectOption } from './SelectDialog';

import './Select.css';

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

interface BaseSelectProps {
  options: SelectOption[];
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

interface DefaultSingleSelectProps extends BaseSelectProps {
  selectionMode?: undefined;
  value?: string | null;
  onChange: (value: string | null) => void;
}

interface SingleSelectProps extends BaseSelectProps {
  selectionMode: 'single';
  value?: string | null;
  onChange: (value: string | null) => void;
}

interface MultiSelectProps extends BaseSelectProps {
  selectionMode: 'multiple';
  value?: string[];
  onChange: (value: string[]) => void;
}

type SelectProps = DefaultSingleSelectProps | SingleSelectProps | MultiSelectProps;

const Select: React.FC<SelectProps> = (props) => {
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);

  const displayValue = useMemo(() => {
    if (!props.value) return '';
    const result: string[] = [];
    for (const opt of props.options) {
      if ((props.selectionMode || 'single') === 'single' && props.value === opt.value) {
        result.push(opt.title);
        break;
      } else if (
        Array.isArray(props.value) &&
        props.selectionMode === 'multiple' &&
        props.value.includes(opt.value)
      ) {
        result.push(opt.title);
      }
    }
    return result.join(', ');
  }, [props.options, props.value, props.selectionMode]);

  const onDialogClose = useCallback(
    (newValue: string | string[] | null) => {
      if (
        (props.selectionMode || 'single') === 'single' &&
        (typeof newValue === 'string' || newValue === null)
      ) {
        const { onChange } = props as SingleSelectProps;
        onChange(newValue);
      } else if (props.selectionMode === 'multiple' && Array.isArray(newValue)) {
        const { onChange } = props as MultiSelectProps;
        onChange(newValue);
      }
      setDialogVisible(false);
    },
    [props]
  );

  const dialog = useMemo(() => {
    if (!dialogVisible) return null;
    return (
      <SelectDialog
        options={props.options}
        selectionMode={props.selectionMode}
        initialValue={props.value}
        onHide={onDialogClose}
      />
    );
  }, [dialogVisible, props.options, props.selectionMode, props.value, onDialogClose]);

  if ((props.selectionMode || 'single') === 'single' && props.options.length < 20) {
    return (
      <select
        value={(props.value as string) || ''}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const { onChange } = props as SingleSelectProps;
          onChange(e.target.value || null);
        }}
        style={props.style}
        disabled={props.disabled}
      >
        <option value={''}>
          <span className="null-value" />
        </option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            <div className="option-label" title={option.description}>
              {option.title}
            </div>
          </option>
        ))}
      </select>
    );
  }

  return (
    <DialogBasedSelect style={props.style}>
      {dialog}
      <InputText
        value={displayValue}
        placeholder={props.placeholder}
        readOnly={true}
        disabled={props.disabled}
        style={{ flexGrow: 1 }}
        onDoubleClick={() => {
          if (props.disabled) return;
          setDialogVisible(true);
        }}
        onChange={() => {}}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') setDialogVisible(true);
        }}
      />
      <Button
        label="..."
        onClick={() => setDialogVisible(true)}
        disabled={props.disabled}
      />
    </DialogBasedSelect>
  );
};

export default Select;
