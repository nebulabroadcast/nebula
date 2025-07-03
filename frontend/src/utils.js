import nebula from '/src/nebula';

import { isEmpty, isEqual, xorWith, cloneDeep } from 'lodash';

const arrayEquals = (x, y) => isEmpty(xorWith(x, y, isEqual));

const deepCopy = (obj) => cloneDeep(obj);

const sortByKey = (array, key) => {
  // Return a copy of array of objects sorted
  // by the given key
  return array.sort(function (a, b) {
    var x = a[key];
    var y = b[key];
    return x < y ? -1 : x > y ? 1 : 0;
  });
};

const formatTimeString = (timestamp) => {
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

const zpad = (n) => String(n).padStart(2, '0');

const dateToDateString = (localDateTime) => {
  if (!localDateTime) return '';
  const yy = localDateTime.getFullYear();
  const mm = localDateTime.getMonth() + 1; // Months are zero-based
  const dd = localDateTime.getDate();
  const dateStr = `${yy}-${zpad(mm)}-${zpad(dd)}`;
  return dateStr;
};

const dateToTimeString = (localDateTime) => {
  if (!localDateTime) return '';
  const hh = localDateTime.getHours();
  const min = localDateTime.getMinutes();
  const ss = localDateTime.getSeconds();
  const timeStr = `${zpad(hh)}:${zpad(min)}:${zpad(ss)}`;
  return timeStr;
};

export {
  arrayEquals,
  deepCopy,
  isEmpty,
  sortByKey,
  formatTimeString,
  dateToDateString,
  dateToTimeString,
};
