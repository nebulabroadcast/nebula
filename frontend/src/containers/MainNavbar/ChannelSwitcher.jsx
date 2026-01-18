import { useEffect } from 'react';

import nebula from '/src/nebula';
import { useNebula } from '/src/features/Nebula';
import { Dropdown } from '/src/components';

const ChannelSwitcher = () => {
  const { setCurrentChannel, currentChannelId } = useNebula();

  useEffect(() => {
    if (!currentChannelId && nebula.settings?.playout_channels?.length) {
      setCurrentChannel(nebula.settings.playout_channels[0].id);
    }
  }, [currentChannelId, setCurrentChannel]);

  if ((nebula.settings?.playout_channels || []).length < 2) {
    return null;
  }

  const channelOptions = nebula.settings?.playout_channels.map((channel) => ({
    label: channel.name,
    onClick: () => setCurrentChannel(channel.id),
  }));

  const currentChannelName = nebula.settings?.playout_channels.find(
    (channel) => channel.id === currentChannelId
  )?.name;

  return (
    <Dropdown
      align="right"
      options={channelOptions}
      buttonStyle={{ background: 'none' }}
      label={currentChannelName}
    />
  );
};

export default ChannelSwitcher;
