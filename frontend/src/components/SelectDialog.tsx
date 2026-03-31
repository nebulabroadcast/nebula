import clsx from 'clsx';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import styled from 'styled-components';

import Button from './Button';
import Dialog from './Dialog';
import InputText from './InputText';
import { sortByKey } from './lib/sortByKey';

export interface SelectOption {
  value: string; // Changed from string | number
  title: string;
  description?: string;
  role?: string;
  level?: number;
}

interface OptionProps {
  option: SelectOption;
  selected: boolean;
  onClick: () => void;
}

const BaseOption = styled.div`
  padding: var(--input-padding);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  user-drag: none;
  background-color: var(--color-surface-03);

  &.selected {
    color: var(--color-cyan);
    background-color: var(--color-surface-05);
  }

  &.label {
    font-weight: bold;
    background-color: transparent;
  }

  &.header {
    font-weight: bold;
    background-color: transparent;
  }
`;

const Option: React.FC<OptionProps> = ({ option, selected, onClick }) => {
  return (
    <BaseOption
      className={clsx(selected && 'selected', option.role === 'label' && 'label')}
      style={{ paddingLeft: (option.level || 0) * 15 }}
      onClick={option.role === 'label' ? undefined : onClick}
      data-tooltip={option.description}
    >
      {option.title}
    </BaseOption>
  );
};

function filterHierarchy(
  array: SelectOption[],
  query: string,
  currentSelection: Record<string, boolean>
): SelectOption[] {
  const queryLower = query.toLowerCase();
  const result: SelectOption[] = [];
  const set = new Set<string>();
  for (const item of array) {
    const newItem = { ...item };
    if (typeof newItem.value !== 'string') newItem.level = 1;
    else newItem.level = newItem.value.split('.').length;

    if (
      newItem.title.toLowerCase().includes(queryLower) ||
      newItem.value in currentSelection
    ) {
      if (newItem.role === 'hidden') {
        continue;
      }
      result.push(newItem);
      set.add(newItem.value);

      let currentVal: string | undefined = newItem.value;
      while (currentVal) {
        const parts: string[] = currentVal!.split('.');
        if (parts.length <= 1) {
          break;
        }
        parts.pop();
        currentVal = parts.join('.');
        const parent = array.find((i) => i.value === currentVal);
        if (parent && !set.has(parent.value) && parent.role !== 'hidden') {
          result.push({ ...parent, level: parts.length });
          set.add(parent.value);
        }
      }
    }
  }
  return sortByKey(result, 'value');
}

interface SelectDialogProps {
  options: SelectOption[];
  onHide: (value: string | string[] | null) => void;
  selectionMode?: 'single' | 'multiple';
  initialValue?: string | string[] | null;
  title?: string;
}

const SelectDialog: React.FC<SelectDialogProps> = ({
  options,
  onHide,
  selectionMode = 'single',
  initialValue = null,
  title,
}) => {
  const [filter, setFilter] = useState<string>('');
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  const filterRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (filterRef.current) {
      filterRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRef.current]);

  useEffect(() => {
    if (
      selectionMode === 'single' &&
      typeof initialValue === 'string' &&
      initialValue !== null
    ) {
      setSelection({ [initialValue]: true });
      return;
    } else if (selectionMode === 'multiple' && Array.isArray(initialValue)) {
      const result: Record<string, boolean> = {};
      for (const r of initialValue) result[r] = true;
      setSelection(result);
      return;
    }
    setSelection({}); // Clear selection if initialValue doesn't match mode
  }, [initialValue, selectionMode]);

  const filteredOptions = useMemo(() => {
    return filterHierarchy(options, filter, selection);
  }, [options, filter, selection]);

  const onToggle = (key: string) => {
    setSelection((os) => {
      if (selectionMode === 'single') return { [key]: true };
      const result = { ...os };
      result[key] = !os[key];
      return result;
    });
  };

  const onClose = () => {
    onHide(initialValue);
  };

  const onUnset = () => {
    onHide(null);
  };

  const onApply = () => {
    let value: string | string[] | null = Object.keys(selection).filter(
      (key) => selection[key]
    );
    if (selectionMode === 'single')
      value = (value as string[]).length ? (value as string[])[0] : null;
    onHide(value);
  };

  const header = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      {title && (
        <div style={{ width: '100%' }}>
          <h3 style={{ padding: 0, marginTop: 0, marginBottom: 10 }}>{title}</h3>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexDirection: 'row',
        }}
      >
        <InputText
          placeholder="Filter"
          value={filter}
          onChange={setFilter}
          ref={filterRef}
          style={{ flexGrow: 1 }}
        />
        <Button
          onClick={() => setFilter('')}
          icon="filter_alt_off"
          data-tooltip="Clear filter"
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button onClick={() => onUnset()} label="Unset" icon="backspace" />
      <Button onClick={() => onClose()} label="Cancel" icon="close" />
      <Button onClick={() => onApply()} label="Apply" icon="check" />
    </>
  );

  return (
    <Dialog
      onHide={() => onClose()}
      style={{ minWidth: 400 }}
      header={header}
      footer={footer}
    >
      <div className="scroll-box">
        <div className="scroll-box-cont">
          {filteredOptions.map((option) => (
            <Option
              key={option.value}
              option={option}
              selected={selection[option.value]}
              onClick={() => onToggle(option.value)}
            />
          ))}
        </div>
      </div>
    </Dialog>
  );
};

export default SelectDialog;
