const zpad = (n: any) => String(n).padStart(2, '0');

export const dateToDateString = (localDateTime: Date | null) => {
  if (!localDateTime) return '';
  const yy = localDateTime.getFullYear();
  const mm = localDateTime.getMonth() + 1; // Months are zero-based
  const dd = localDateTime.getDate();
  const dateStr = `${yy}-${zpad(mm)}-${zpad(dd)}`;
  return dateStr;
};

export const dateToTimeString = (localDateTime: Date | null) => {
  if (!localDateTime) return '';
  const hh = localDateTime.getHours();
  const min = localDateTime.getMinutes();
  const ss = localDateTime.getSeconds();
  const timeStr = `${zpad(hh)}:${zpad(min)}:${zpad(ss)}`;
  return timeStr;
};
