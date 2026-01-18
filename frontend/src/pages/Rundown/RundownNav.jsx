import { useMemo } from 'react';

import nebula from '/src/nebula';
import { Navbar, Spacer, RadioButton } from '/src/components';
import DateNav from '/src/containers/DateNav';
import { useNebula } from '/src/features/Nebula';

const RundownNav = ({ setStartTime, rundownMode, setRundownMode }) => {
  const { setPageTitle, currentChannelId } = useNebula();

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannelId);
  }, [currentChannelId]);

  const onDateChange = (date) => {
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
