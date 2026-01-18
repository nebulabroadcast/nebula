export interface PageTitle {
  title: string;
  icon?: string;
}

export interface NebulaState {
  browserRefreshId: number;
  currentChannelId: number | null;
  currentViewId: number;
  focusedAsset: number | null;
  pageTitle: PageTitle;
  searchQuery: string;
  selectedAssets: number[];
}

export interface NebulaContextType extends NebulaState {
  reloadBrowser: () => void;
  setCurrentChannel: (channelId: number | null) => void;
  setCurrentView: (viewId: number) => void;
  setFocusedAsset: (assetId: number | null) => void;
  setPageTitle: (title: string, icon?: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedAssets: (assetIds: number[]) => void;
}

