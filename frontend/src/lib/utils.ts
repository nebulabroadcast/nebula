import { isEmpty, isEqual, xorWith } from 'lodash';

import nebula from '@/nebula';

export const arrayEquals = (x: any[], y: any[]) => isEmpty(xorWith(x, y, isEqual));

export const formatTimeString = (timestamp: number) => {
  if (!timestamp) return '';
  const localDateTime = new Date(timestamp * 1000);
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateFormatter = new Intl.DateTimeFormat(nebula.locale, {
    timeZone: localTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat(nebula.locale, {
    timeZone: localTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const localDate = dateFormatter.format(localDateTime);
  const localTime = timeFormatter.format(localDateTime);
  return `${localDate} ${localTime}`;
};

export const zpad = (n: string | number, len = 2) => String(n).padStart(len, '0');

export const dateToDateString = (localDateTime: Date) => {
  if (!localDateTime) return '';
  const yy = localDateTime.getFullYear();
  const mm = localDateTime.getMonth() + 1; // Months are zero-based
  const dd = localDateTime.getDate();
  const dateStr = `${yy}-${zpad(mm)}-${zpad(dd)}`;
  return dateStr;
};

export const dateToTimeString = (localDateTime: Date) => {
  if (!localDateTime) return '';
  const hh = localDateTime.getHours();
  const min = localDateTime.getMinutes();
  const ss = localDateTime.getSeconds();
  const timeStr = `${zpad(hh)}:${zpad(min)}:${zpad(ss)}`;
  return timeStr;
};
