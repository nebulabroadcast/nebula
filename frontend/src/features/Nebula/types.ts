import type { ClientSettingsModel } from '@/client';

export interface PageTitle {
  title: string;
  icon?: string;
}

export interface NebulaState {
  currentChannelId: number | null;
  focusedAsset: number | null;
  pageTitle: PageTitle;
  selectedAssets: number[];
  // Bumped by applySettings: the app remounts its pages, which read
  // nebula.settings again
  settingsVersion: number;
}

export interface NebulaContextType extends NebulaState {
  setCurrentChannel: (channelId: number | null) => void;
  setFocusedAsset: (assetId: number | null) => void;
  setPageTitle: (title: string, icon?: string) => void;
  setSelectedAssets: (assetIds: number[]) => void;
  // Replace nebula.settings and re-render everything that reads them
  applySettings: (settings: ClientSettingsModel) => void;
}
