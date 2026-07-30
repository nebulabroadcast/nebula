

import DateNav from '@containers/DateNav';
import React, { useState, useMemo } from 'react';

import ApplySchedulingTemplate from './ApplySchedulingTemplate';
import { createTitle } from './utils';

import { Navbar, Button, Spacer } from '@/components';
import DraggableIcon from '@/containers/DraggableIcon';
import { useNebula } from '@/features/Nebula';
import nebula from '@/nebula';

const dragIcons = [
  {
    name: 'empty_event',
    tooltip: 'Empty event',
    icon: 'calendar_add_on',
    data: {
      type: 'event',
      title: 'Empty event',
    },
  },
];

interface SchedulerNavProps {
  setStartTime: (date: Date) => void;
  loadEvents: () => void;
  deleteUnaired: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const SchedulerNav: React.FC<SchedulerNavProps> = ({
  setStartTime,
  loadEvents,
  deleteUnaired,
  loading,
  setLoading,
}) => {
  const { setPageTitle, currentChannelId } = useNebula();
  const [date, setDate] = useState<Date>();

  const channelConfig = useMemo(() => {
    if (currentChannelId === null) return undefined;
    return nebula.getPlayoutChannel(currentChannelId);
  }, [currentChannelId]);

  const onDateChange = (newDateVal: string) => {
    const [dsHH, dsMM] = channelConfig?.day_start || [7, 0];

    const newDateX = new Date(newDateVal);
    // add 12 hours to the date to avoid timezone issues
    const newDate = new Date(newDateX.getTime() + 12 * 60 * 60 * 1000);

    const dayOfWeek = newDate.getDay();
    const diff = newDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(newDate.setDate(diff));
    weekStart.setHours(dsHH, dsMM, 0, 0);

    const pageTitle = createTitle(weekStart, channelConfig?.name || 'Unknown channel');
    setPageTitle(pageTitle);

    setStartTime(weekStart);
    setDate(new Date(newDateVal));
  };

  return (
    <Navbar>
      <DateNav onChange={onDateChange} skipBy={7} />
      <Spacer />
      {dragIcons.map((icon, index) => (
        <DraggableIcon
          key={index}
          name={icon.name}
          icon={icon.icon}
          tooltip={icon.tooltip}
          data={icon.data}
        />
      ))}
      <ApplySchedulingTemplate
        loadEvents={loadEvents}
        date={date}
        loading={loading}
        setLoading={setLoading}
      />
      <Button
        icon="delete"
        label="Delete unaired"
        onClick={deleteUnaired}
        disabled={loading}
      />
    </Navbar>
  );
};

export default SchedulerNav;
