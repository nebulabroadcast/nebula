import { Button } from '@components';
import React, { useState, useEffect } from 'react';

import ToggleButtonContainer from './ToggleButtonContainer';

interface GainButtonProps {
  gainNode: GainNode;
  index: number;
}

const GainButton: React.FC<GainButtonProps> = ({ gainNode, index }) => {
  const [active, setActive] = useState(gainNode.gain.value === 1);

  // shift+1..9 toggles the matching channel, same as clicking the button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      if (e.code === `Digit${index + 1}`) {
        setActive((a) => !a);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [index]);

  // active is the source of truth, the gain node follows it
  useEffect(() => {
    gainNode.gain.setValueAtTime(active ? 1 : 0, gainNode.context.currentTime);
  }, [active, gainNode]);

  const handleToggle = () => {
    setActive((a) => !a);
  };

  return (
    <Button
      label={`A ${index + 1}`}
      onClick={handleToggle}
      active={active}
      tooltip={`${active ? 'Mute' : 'Unmute'} channel ${index + 1}`}
    />
  );
};

interface ChannelSelectProps {
  gainNodes: GainNode[];
}

const ChannelSelect: React.FC<ChannelSelectProps> = ({ gainNodes }) => {
  return (
    <ToggleButtonContainer>
      {gainNodes.map((gainNode, index) => (
        <GainButton gainNode={gainNode} key={index} index={index} />
      ))}
    </ToggleButtonContainer>
  );
};

export default ChannelSelect;
