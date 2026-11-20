import { Button, Navbar, RadioButton, Spacer } from '@components';
import { useLocalStorage } from '@lib/useLocalStorage';
import styled from 'styled-components';

import type { AuxChanges } from '../assetApi';
import { usePlayer } from '../playerContext';

import { SidePanelMain } from './SidePanelMain';
import { SidePanelSubclips } from './SidePanelSubclips';
import { SidePanelTranscription } from './SidePanelTranscription.tsx';
import type { AssetData } from './types.ts';

export type EditorMode = 'metadata' | 'preview';
type SidePanelTab = 'main' | 'subclips' | 'transcription';

interface TabOption {
  value: SidePanelTab;
  icon: string;
  description: string;
  // needs the video player, so only offered in preview mode
  needsPlayer: boolean;
}

const TABS: TabOption[] = [
  {
    value: 'main',
    icon: 'settings',
    description: 'Content selection and poster frame',
    needsPlayer: true,
  },
  {
    value: 'subclips',
    icon: 'content_cut',
    description: 'Manage subclips',
    needsPlayer: true,
  },
  {
    value: 'transcription',
    icon: 'text_ad',
    description: 'View and edit transcriptions',
    needsPlayer: true,
  },
];

type SidebarState = Record<EditorMode, { open: boolean; tab: SidePanelTab | null }>;

const DEFAULT_STATE: SidebarState = {
  metadata: { open: true, tab: null },
  preview: { open: true, tab: 'main' },
};

const CollapsedStrip = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
  width: 36px;
  background-color: var(--color-surface-02);
`;

interface SidePanelProps {
  editorMode: EditorMode;
  assetData: Record<string, any>;
  setAssetData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  auxChanges: AuxChanges;
  setAux: (key: string, data: unknown) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  editorMode,
  assetData,
  setAssetData,
  auxChanges,
  setAux,
}) => {
  const { videoPlayerRef, position, selection, setSelection } = usePlayer();
  const [state, setState] = useLocalStorage<SidebarState>(
    'mam.editor.sidebar',
    DEFAULT_STATE
  );
  const frameRate = assetData['video/fps_f'] || 25;

  const tabs = TABS.filter((tab) => editorMode === 'preview' || !tab.needsPlayer);
  if (!tabs.length) return null;

  const { open, tab: storedTab } = state[editorMode] ?? DEFAULT_STATE[editorMode];
  // a tab remembered in another mode, or one this mode doesn't have
  const tab = tabs.find((t) => t.value === storedTab)?.value ?? tabs[0].value;

  const patchMode = (patch: Partial<SidebarState[EditorMode]>) => {
    setState((s) => ({
      ...s,
      [editorMode]: { ...(s[editorMode] ?? DEFAULT_STATE[editorMode]), ...patch },
    }));
  };

  const patchAsset = (data: Partial<AssetData>) => {
    if (!data) return;
    setAssetData((o) => ({ ...o, ...data }));
  };

  if (!open) {
    return (
      <CollapsedStrip>
        <Button
          icon="right_panel_open"
          tooltip="Show sidebar"
          onClick={() => {
            patchMode({ open: true });
          }}
        />
      </CollapsedStrip>
    );
  }

  return (
    <div className="column" style={{ width: 400, minWidth: 400 }}>
      <Navbar>
        <RadioButton
          options={tabs}
          value={tab}
          onChange={(value) => {
            patchMode({ tab: value as SidePanelTab });
          }}
        />
        <Spacer />
        <Button
          icon="right_panel_close"
          tooltip="Hide sidebar"
          onClick={() => {
            patchMode({ open: false });
          }}
        />
      </Navbar>

      {tab === 'main' && (
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

      {tab === 'subclips' && (
        <SidePanelSubclips
          assetData={assetData}
          frameRate={frameRate}
          selection={selection}
          setSelection={setSelection}
          patchAsset={patchAsset}
          videoPlayerRef={videoPlayerRef}
        />
      )}

      {tab === 'transcription' && (
        <SidePanelTranscription
          assetData={assetData}
          frameRate={frameRate}
          videoPlayerRef={videoPlayerRef}
          selection={selection}
          setSelection={setSelection}
          auxChanges={auxChanges}
          setAux={setAux}
          position={position}
        />
      )}
    </div>
  );
};
