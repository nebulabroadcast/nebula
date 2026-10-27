export interface PageTitle {
  title: string;
  icon?: string;
}

export interface NebulaState {
  currentChannelId: number | null;
  focusedAsset: number | null;
  pageTitle: PageTitle;
  selectedAssets: number[];
}

export interface NebulaContextType extends NebulaState {
  setCurrentChannel: (channelId: number | null) => void;
  setFocusedAsset: (assetId: number | null) => void;
  setPageTitle: (title: string, icon?: string) => void;
  setSelectedAssets: (assetIds: number[]) => void;
}
