import clsx from 'clsx';
import { DateTime } from 'luxon';
import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

import Button from './Button';
import DatePickerDialog from './DatePickerDialog';
import Input from './Input.styled';

const timeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
//eslint-disable-next-line
const allowedDateCharsRegex = /^[\d-\:\ ]*$/;

const DateTimeWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  min-width: 200px;
`;

interface CalendarDialogProps {
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
}

const CalendarDialog = ({ value, onChange, onClose }: CalendarDialogProps) => {
  // get current timestamp
  const defaultDate = DateTime.local().toSeconds();

  const [date, setDate] = useState(DateTime.fromSeconds(value || defaultDate));

  return (
    <DatePickerDialog
      title="Select Date"
      value={date.toFormat('yyyy-MM-dd')}
      handleCancel={onClose}
      handleConfirm={(newDateString: string) => {
        const newDate = DateTime.fromFormat(newDateString, 'yyyy-MM-dd').set({
          hour: date.hour,
          minute: date.minute,
          second: date.second,
        });
        setDate(newDate);
        onChange(newDate.toSeconds());
        onClose();
      }}
      cancelLabel="Close"
      confirmLabel="Select"
    />
  );
};

interface InputDatetimeProps {
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
  mode: 'date' | 'datetime';
  className: string;
}

const InputDatetime = ({
  value,
  onChange,
  placeholder,
  mode,
  className,
}: InputDatetimeProps) => {
  const [time, setTime] = useState<string>();
  const [isFocused, setIsFocused] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const inputRef = useRef(null);

  const timestampFormat = mode === 'date' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss';
  const timestampRegex = mode === 'date' ? dateRegex : timeRegex;

  useEffect(() => {
    if (!value) {
      setTime('');
      return;
    }

    setTime(DateTime.fromSeconds(value).toFormat(timestampFormat));
  }, [value, timestampFormat]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value;
    if (!allowedDateCharsRegex.test(newValue)) return;

    // if the original value ended with a dash and the new value removes this dash,
    // so it is one byte shorter than the original value, we need to remove the dash
    // as well as the last character of the new value

    if (time && time.length - 1 === newValue.length && time.endsWith('-')) {
      newValue = newValue.slice(0, -1);
    } else if (
      [4, 7].includes(newValue.length) &&
      newValue.charAt(newValue.length - 1) !== '-'
    )
      newValue = newValue + '-';
    setTime(newValue);
  };

  const isValidTime = (timeString: string | undefined) => {
    if (!timeString) return true; // empty string is valid
    if (timestampRegex.test(timeString))
      return DateTime.fromFormat(timeString, timestampFormat).isValid;
    return false;
  };

  const onSubmit = () => {
    if (!inputRef.current) return;
    if (!time) {
      onChange(0);
      setIsFocused(false);
      return;
    }
    let value = 0;

    if (dateRegex.test(time) && mode !== 'date') {
      setTime(time + ' 00:00:00');
      return;
    }

    if (time && isValidTime(time)) {
      value = DateTime.fromFormat(time, timestampFormat).toSeconds();
    }
    onChange(value);
    (inputRef.current as HTMLInputElement).blur();
    setIsFocused(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <DateTimeWrapper>
      {showCalendar && (
        <CalendarDialog
          value={value}
          onChange={onChange}
          onClose={() => setShowCalendar(false)}
        />
      )}
      <Input
        type="text"
        ref={inputRef}
        value={time || ''}
        onChange={handleChange}
        style={{ flexGrow: 1 }}
        className={clsx(className, { error: !isValidTime(time) })}
        placeholder={isFocused ? timestampFormat : placeholder}
        data-tooltip={`Please enter a valid time in the format ${timestampFormat}`}
        onBlur={onSubmit}
        onFocus={(e) => {
          e.target.select();
          setIsFocused(true);
        }}
        onKeyDown={onKeyDown}
      />
      <Button icon="calendar_today" onClick={() => setShowCalendar(true)} />
    </DateTimeWrapper>
  );
};

export default InputDatetime;
