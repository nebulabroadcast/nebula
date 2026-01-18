import React, { createContext, useState, useCallback } from 'react';

import type { NebulaContextType, NebulaState } from './types';

const LS_KEY_CURRENT_CHANNEL = 'mam.currentChannelId';
const LS_KEY_CURRENT_VIEW = 'mam.currentViewId';
const LS_KEY_SEARCH_QUERY = 'mam.searchQuery';

const DEFAULT_NEBULA_CONTEXT: NebulaState = {
  pageTitle: { title: 'Nebula' },
  browserRefreshId: 0,
  currentChannelId: JSON.parse(localStorage.getItem(LS_KEY_CURRENT_CHANNEL) || 'null'),
  currentViewId: JSON.parse(localStorage.getItem(LS_KEY_CURRENT_VIEW) || 'null'),
  searchQuery: JSON.parse(localStorage.getItem(LS_KEY_SEARCH_QUERY) || '""'),
  focusedAsset: null,
  selectedAssets: [],
};

export const NebulaContext = createContext<NebulaContextType | undefined>(undefined);

interface NebulaProviderProps {
  children: React.ReactNode;
}

export const NebulaProvider: React.FC<NebulaProviderProps> = ({
  children,
}: NebulaProviderProps) => {
  const [nebulaState, setNebulaState] = useState<NebulaState>(DEFAULT_NEBULA_CONTEXT);

  const setCurrentView = useCallback((viewId: number) => {
    if (typeof viewId !== 'number') {
      throw new Error('viewId must be a number');
    }
    localStorage.setItem(LS_KEY_CURRENT_VIEW, JSON.stringify(viewId));
    setNebulaState((prev) => ({ ...prev, currentViewId: viewId }));
  }, []);

  const reloadBrowser = useCallback(() => {
    setNebulaState((prev) => ({ ...prev, browserRefresh: prev.browserRefreshId + 1 }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    localStorage.setItem(LS_KEY_SEARCH_QUERY, JSON.stringify(query));
    setNebulaState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setSelectedAssets = useCallback((assetIds: number[]) => {
    setNebulaState((prev) => ({ ...prev, selectedAssets: assetIds }));
  }, []);

  const setFocusedAsset = useCallback((assetId: number | null) => {
    setNebulaState((prev) => ({ ...prev, focusedAsset: assetId }));
  }, []);

  const setPageTitle = useCallback((title: string, icon?: string) => {
    setNebulaState((prev) => ({ ...prev, pageTitle: { title, icon } }));
  }, []);

  const setCurrentChannel = useCallback((channelId: number | null) => {
    localStorage.setItem(LS_KEY_CURRENT_CHANNEL, JSON.stringify(channelId));
    setNebulaState((prev) => ({ ...prev, currentChannelId: channelId }));
  }, []);

  const contextValue: NebulaContextType = {
    ...nebulaState,
    setCurrentView,
    reloadBrowser,
    setSearchQuery,
    setSelectedAssets,
    setFocusedAsset,
    setPageTitle,
    setCurrentChannel,
  };

  return (
    <NebulaContext.Provider value={contextValue}>{children}</NebulaContext.Provider>
  );
};
