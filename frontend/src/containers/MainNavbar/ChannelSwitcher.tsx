import { Dropdown } from '@components';
import { useNebula } from '@features/Nebula';
import { useEffect } from 'react';

import nebula from '@/nebula';

const ChannelSwitcher = () => {
  const { setCurrentChannel, currentChannelId } = useNebula();

  // Fall back to the first channel when none is selected, or when the stored
  // one no longer exists (the switcher is hidden with a single channel, so
  // there would be no way to change it otherwise)
  useEffect(() => {
    const channels = nebula.settings?.playout_channels || [];
    if (channels.some((channel) => channel.id === currentChannelId)) return;
    const fallbackId = channels[0]?.id ?? null;
    if (fallbackId !== currentChannelId) setCurrentChannel(fallbackId);
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
