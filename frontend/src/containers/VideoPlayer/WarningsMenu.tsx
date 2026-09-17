import { Button, InputSwitch } from '@components';
import styled from 'styled-components';

const WarningsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
`;

const WarningsRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  white-space: nowrap;
`;

interface WarningsMenuProps {
  showLumaClip: boolean;
  setShowLumaClip: (value: boolean) => void;
  showChromaClip: boolean;
  setShowChromaClip: (value: boolean) => void;
  scanDuringPlayback: boolean;
  setScanDuringPlayback: (value: boolean) => void;
}

const WarningsMenu = ({
  showLumaClip,
  setShowLumaClip,
  showChromaClip,
  setShowChromaClip,
  scanDuringPlayback,
  setScanDuringPlayback,
}: WarningsMenuProps) => {
  const anyClipWarning = showLumaClip || showChromaClip;

  return (
    <div className="nb-dropdown">
      <Button
        icon="warning"
        tooltip="Broadcast safety warnings"
        active={anyClipWarning}
      />
      <WarningsContent className="dropdown-content">
        <WarningsRow>
          Luma range warning
          <InputSwitch value={showLumaClip} onChange={setShowLumaClip} />
        </WarningsRow>
        <WarningsRow>
          Chroma / gamut warning
          <InputSwitch value={showChromaClip} onChange={setShowChromaClip} />
        </WarningsRow>
        <WarningsRow>
          Scan during playback
          <InputSwitch
            value={scanDuringPlayback}
            onChange={setScanDuringPlayback}
            disabled={!anyClipWarning}
          />
        </WarningsRow>
      </WarningsContent>
    </div>
  );
};

export default WarningsMenu;
