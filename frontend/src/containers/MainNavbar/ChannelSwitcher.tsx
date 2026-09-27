import { Dropdown } from '@components';
import { useNebula } from '@features/Nebula';
import { useEffect } from 'react';

import nebula from '@/nebula';

const ChannelSwitcher = () => {
  const { setCurrentChannel, currentChannelId } = useNebula();

  useEffect(() => {
    const firstChannel = nebula.settings?.playout_channels?.[0];
    if (!currentChannelId && firstChannel) {
      setCurrentChannel(firstChannel.id);
    }
  }, [currentChannelId, setCurrentChannel]);

  if ((nebula.settings?.playout_channels || []).length < 2) {
    return null;
  }

  const channelOptions = nebula.settings?.playout_channels?.map((channel) => ({
    label: channel.name,
    value: channel.id,
    onClick: () => {
      setCurrentChannel(channel.id);
    },
  }));

  const currentChannelName = nebula.settings?.playout_channels?.find(
    (channel) => channel.id === currentChannelId
  )?.name;

  return (
    <Dropdown
      align="right"
      options={channelOptions || []}
      buttonStyle={{ background: 'none' }}
      label={currentChannelName}
    />
  );
};

export default ChannelSwitcher;
