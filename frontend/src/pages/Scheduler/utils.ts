import { DateTime, DateTimeFormatOptions } from 'luxon';

import nebula from '@/nebula';

export const createTitle = (startTime: Date, channelName: string) => {

  // channelName is not unused, but will be used in the future for more complex titles
  // @ts-expect-error: cname is reserved for future use
  const _cname = channelName;
    
  const dparams: DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
  };

  const date = DateTime.fromJSDate(startTime).setLocale(nebula.locale);
  const weekNumber = date.weekNumber;
  const formattedStart = date.toLocaleString(dparams);
  const formattedEnd = date.plus({ days: 6 }).toLocaleString(dparams);

  return `${formattedStart} - ${formattedEnd} (${weekNumber})`;
};
