import { Navbar, RadioButton } from '@components';
import { VideoPlayerRef } from '@containers/VideoPlayer/types.ts';
import { useState } from 'react';

import { SidePanelMain } from './SidePanelMain';
import { SidePanelSubclips } from './SidePanelSubclips';
import { SidePanelTranscription } from './SidePanelTranscription.tsx';
import type { AssetData } from './types.ts';

type SidePanelMode = 'main' | 'subclips' | 'transcription';

const SidePanelOptions = [
  {
    value: 'main',
    icon: 'settings',
    description: 'Content selection and poster frame',
  },
  {
    value: 'subclips',
    icon: 'content_cut',
    description: 'Manage subclips',
  },
  {
    value: 'transcription',
    icon: 'text_ad',
    description: 'View and edit transcriptions',
  },
];

interface SidePanelProps {
  assetData: Record<string, any>;
  setAssetData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  videoPlayerRef: React.RefObject<VideoPlayerRef | null>;
  position: number;
  selection: { mark_in: number | null; mark_out: number | null };
  setSelection: React.Dispatch<
    React.SetStateAction<{ mark_in: number | null; mark_out: number | null }>
  >;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  assetData,
  setAssetData,
  selection,
  setSelection,
  videoPlayerRef,
  position,
}) => {
  const frameRate = assetData['video/fps_f'] || 25;
  const [mode, setMode] = useState<SidePanelMode>('main');

  const patchAsset = (data: Partial<AssetData>) => {
    // helper function to update asset data
    console.log('Patching asset with data', data);
    if (!data) return;
    setAssetData((o) => {
      return { ...o, ...data };
    });
  };

  return (
    <div className="column" style={{ minWidth: 400 }}>
      <Navbar>
        <RadioButton
          options={SidePanelOptions}
          value={mode}
          onChange={(e) => {
            setMode(e as SidePanelMode);
          }}
        />
      </Navbar>

      {mode === 'main' && (
        <SidePanelMain
          assetData={assetData}
          frameRate={frameRate}
          position={position}
          selection={selection}
          setSelection={setSelection}
          patchAsset={patchAsset}
          videoPlayerRef={videoPlayerRef}
        />
      )}

      {mode === 'subclips' && (
        <SidePanelSubclips
          assetData={assetData}
          frameRate={frameRate}
          selection={selection}
          setSelection={setSelection}
          patchAsset={patchAsset}
          videoPlayerRef={videoPlayerRef}
        />
      )}

      {mode === 'transcription' && (
        <SidePanelTranscription
          assetData={assetData}
          videoPlayerRef={videoPlayerRef}
          setSelection={setSelection}
          position={position}
        />
      )}
    </div>
  );
};
