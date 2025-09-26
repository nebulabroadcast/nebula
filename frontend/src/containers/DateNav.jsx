import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useDialog } from '@hooks/useDialog';
import { Button } from '@components';
import { dateToDateString } from '/src/utils';

const DateNav = ({ onChange, skipBy = 1 }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState();
  const showDialog = useDialog();

  useEffect(() => {
    let dateParam = searchParams.get('date');
    if (date && dateParam === date) return;
    if (!dateParam) dateParam = dateToDateString(new Date());
    setDate(dateParam);
    onChange(dateParam);
  }, [searchParams]);

  // Actions

  const dateStep = (days) => {
    let dateParam = searchParams.get('date');
    if (!dateParam) dateParam = dateToDateString(new Date());
    const currentDate = new Date(dateParam);
    const newDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);
    setSearchParams((o) => {
      o.set('date', dateToDateString(newDate));
      return o;
    });
  };

  const prevDay = () => dateStep(-skipBy);
  const nextDay = () => dateStep(skipBy);

  const today = () => {
    setSearchParams((o) => {
      o.set('date', dateToDateString(new Date()));
      return o;
    });
  };

  const pickDate = async () => {
    try {
      const newDate = await showDialog('date', 'Pick date', { value: date });
      setSearchParams((o) => {
        o.set('date', newDate);
        return o;
      });
    } catch {
      // Do nothing
    }
  };

  // Render
  return (
    <>
      <Button icon="chevron_left" onClick={prevDay} tooltip="Previous day" />
      <Button icon="calendar_month" onClick={pickDate} tooltip="Pick date" />
      <Button icon="today" onClick={today} tooltip="Today" />
      <Button icon="chevron_right" onClick={nextDay} tooltip="Next day" />
    </>
  );
};

export default DateNav;
