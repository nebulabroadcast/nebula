import { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import nebula from '/src/nebula';
import { Navbar, Spacer, RadioButton } from '/src/components';
import DateNav from '/src/containers/DateNav';
import { setPageTitle } from '/src/actions';

const RundownNav = ({ setStartTime, rundownMode, setRundownMode }) => {
  const currentChannel = useSelector((state) => state.context.currentChannel);
  const dispatch = useDispatch();

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel);
  }, [currentChannel]);

  const onDateChange = (date) => {
    const [dsHH, dsMM] = channelConfig?.day_start || [7, 0];

    const newDate = new Date(date);
    newDate.setHours(dsHH, dsMM, 0, 0);
    const pageTitle = `${newDate.toLocaleDateString(nebula.locale, {
      month: 'long',
      weekday: 'long',
      day: 'numeric',
    })}`;
    dispatch(setPageTitle({ title: pageTitle }));
    setStartTime(newDate);
  };

  return (
    <Navbar>
      <DateNav onChange={onDateChange} skipBy={1} />
      <Spacer />
      <RadioButton
        options={[
          { label: 'Edit', value: 'edit' },
          { label: 'Control', value: 'control' },
          { label: 'Plugins', value: 'plugins' },
        ]}
        value={rundownMode}
        onChange={setRundownMode}
      />
      <Spacer />
    </Navbar>
  );
};

export default RundownNav;
