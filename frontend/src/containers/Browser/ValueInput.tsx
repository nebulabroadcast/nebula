import { InputDatetime, InputText, InputTimecode } from '@components';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';

import { parseValue, valueOptions, type Draft } from './conditions';

import nebula from '@/nebula';

interface ValueInputProps {
  draft: Draft;
  onChange: (value: unknown) => void;
  onSubmit: () => void;
}

// The value of a condition, edited as its field expects: options to pick
// (one, or several for "is any of"), yes/no, a timecode, a date or text
const ValueInput = ({ draft, onChange, onSubmit }: ValueInputProps) => {
  const { key, operator, value } = draft;
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, [key, operator.op]);

  if (operator.op === 'exists') return null;
  const options = valueOptions(key);
  const type = nebula.metaType(key).type;

  if (options || type === 'boolean') {
    const choices = options ?? [
      { value: true, title: 'yes' },
      { value: false, title: 'no' },
    ];
    const selected = operator.multi
      ? ((value as unknown[] | undefined) ?? [])
      : [value];
    return (
      <div className="options">
        {choices.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={String(option.value)}
              className={clsx(on && 'on')}
              onClick={() => {
                if (!operator.multi) onChange(option.value);
                else if (on) onChange(selected.filter((v) => v !== option.value));
                else onChange([...selected, option.value]);
              }}
            >
              {option.title}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'timecode') {
    return (
      <InputTimecode
        value={(value as number | undefined) ?? null}
        onChange={(seconds) => {
          onChange(seconds ?? undefined);
        }}
      />
    );
  }

  if (type === 'datetime') {
    return (
      <InputDatetime
        mode="date"
        value={(value as number | undefined) ?? 0}
        onChange={(seconds) => {
          onChange(seconds || undefined);
        }}
        placeholder="YYYY-MM-DD"
        className=""
      />
    );
  }

  // Text and numbers; a list field without options gets one value
  const text = operator.multi ? (value as unknown[] | undefined)?.[0] : value;
  return (
    <InputText
      ref={inputRef}
      value={typeof text === 'string' || typeof text === 'number' ? String(text) : ''}
      onChange={(input) => {
        const parsed = input === '' ? undefined : parseValue(key, input);
        onChange(operator.multi ? (parsed === undefined ? [] : [parsed]) : parsed);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSubmit();
      }}
    />
  );
};

export default ValueInput;
