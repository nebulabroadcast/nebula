import DateNav from '@containers/DateNav';
import React, { useMemo } from 'react';

import nebula from '@/nebula';
import { Navbar, Spacer, RadioButton } from '@components';
import { useNebula } from '@features/Nebula';

interface RundownNavProps {
  startTime: Date | null;
  setStartTime: (date: Date) => void;
  rundownMode: string;
  setRundownMode: (mode: string) => void;
}

const RundownNav: React.FC<RundownNavProps> = ({
  setStartTime,
  rundownMode,
  setRundownMode,
}) => {
  const { setPageTitle, currentChannelId } = useNebula();

  const channelConfig = useMemo(() => {
    return currentChannelId ? nebula.getPlayoutChannel(currentChannelId) : undefined;
  }, [currentChannelId]);

  const onDateChange = (date: string) => {
    const [dsHH, dsMM] = channelConfig?.day_start || [7, 0];

    const newDate = new Date(date);
    newDate.setHours(dsHH, dsMM, 0, 0);
    const pageTitle = `${newDate.toLocaleDateString(nebula.locale, {
      month: 'long',
      weekday: 'long',
      day: 'numeric',
    })}`;
    setPageTitle(pageTitle);
    setStartTime(newDate);
  };

  return (
    <Navbar>
      <DateNav onChange={onDateChange} skipBy={1} />
      <Spacer />
      <RadioButton
        options={[
          { title: 'Edit', value: 'edit' },
          { title: 'Control', value: 'control' },
          { title: 'Plugins', value: 'plugins' },
        ]}
        value={rundownMode}
        onChange={setRundownMode}
      />
      <Spacer />
    </Navbar>
  );
};

export default RundownNav;
