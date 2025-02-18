import { useState, useEffect } from 'react';
import { Button } from '/src/components';
import ToggleButtonContainer from './ToggleButtonContainer';

const GainButton = ({ gainNode, index }) => {
  const [active, setActive] = useState(gainNode.gain.value === 1);

  const handleKeyDown = (e) => {
    if (!e.shiftKey) return;
    if (e.keyCode === 49 + index) {
      gainNode.gain.value = gainNode.gain.value === 0 ? 1 : 0;
      setActive(gainNode.gain.value === 1);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    gainNode.gain.value = active ? 1 : 0;
  }, [active, gainNode]);

  const handleToggle = () => {
    setActive(!active);
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

const ChannelSelect = ({ gainNodes }) => {
  return (
    <ToggleButtonContainer>
      {gainNodes.map((gainNode, index) => (
        <GainButton gainNode={gainNode} key={index} index={index} />
      ))}
    </ToggleButtonContainer>
  );
};

export default ChannelSelect;
