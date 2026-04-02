import { DateTime } from 'luxon';
import { useState, useEffect } from 'react';
import { DatePicker } from 'react-datepicker';

import { Button } from './Button';
import { Dialog } from './Dialog';

const WRAPPER_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
};

interface DatePickerDialogProps {
  title: string;
  value: string;
  handleCancel: () => void;
  handleConfirm: (value: string) => void;
  cancelLabel?: string;
  confirmLabel?: string;
}

const DatePickerDialog = (props: DatePickerDialogProps) => {
  /*
   * A dialog component that allows the user to pick a date.
   * Date is in the format 'yyyy-MM-dd', which is the
   * one and the only sane date format.
   */
  const [value, setValue] = useState<DateTime>();
  const onCancel = () => {
    props.handleCancel();
  };
  const onConfirm = () => {
    if (!value) return;
    const t = value.toFormat('yyyy-MM-dd');
    props.handleConfirm(t);
  };

  useEffect(() => {
    const date = DateTime.fromFormat(props.value, 'yyyy-MM-dd');
    setValue(date);
  }, [props.value]);

  const footer = (
    <>
      <Button
        onClick={onCancel}
        label={props.cancelLabel || 'Cancel'}
        icon="close"
        hlColor="var(--color-red)"
      />
      <Button
        onClick={onConfirm}
        label={props.confirmLabel || 'Confirm'}
        icon="check"
        hlColor="var(--color-green)"
      />
    </>
  );

  const handleChange = (date: Date | null) => {
    if (!date) return;
    setValue(DateTime.fromJSDate(date));
  };

  return (
    <Dialog onHide={onCancel} header={props.title} footer={footer}>
      <div style={WRAPPER_STYLE}>
        {value && (
          <DatePicker
            calendarStartDay={1}
            selected={value.toJSDate()}
            onChange={handleChange}
            inline
          />
        )}
      </div>
    </Dialog>
  );
};

export default DatePickerDialog;
