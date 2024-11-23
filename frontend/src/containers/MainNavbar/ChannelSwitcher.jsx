import { useSelector, useDispatch } from 'react-redux'

import { setCurrentChannel } from '/src/actions'
import nebula from '/src/nebula'

import { Dropdown } from '/src/components'

const ChannelSwitcher = () => {
  const dispatch = useDispatch()
  const currentChannel = useSelector((state) => state.context.currentChannel)

  if ((nebula.settings?.playout_channels || []).length < 2) {
    if (nebula.settings?.playout_channels.length === 1) {
      dispatch(setCurrentChannel(nebula.settings.playout_channels[0].id))
    }
    return null
  }

  if (!nebula.experimental) return null

  const channelOptions = nebula.settings?.playout_channels.map((channel) => ({
    label: channel.name,
    onClick: () => dispatch(setCurrentChannel(channel.id)),
  }))

  const currentChannelName = nebula.settings?.playout_channels.find(
    (channel) => channel.id === currentChannel
  )?.name

  if (!currentChannel) {
    dispatch(setCurrentChannel(nebula.settings.playout_channels[0].id))
  }

  return (
    <Dropdown
      align="right"
      options={channelOptions}
      buttonStyle={{ background: 'none' }}
      label={currentChannelName}
    />
  )
}

export default ChannelSwitcher
