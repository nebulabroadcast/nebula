import React, { useState, useCallback } from 'react';

import { NebulaContext } from './context';
import type { NebulaContextType, NebulaState } from './types';

const LS_KEY_CURRENT_CHANNEL = 'mam.currentChannelId';

const DEFAULT_NEBULA_CONTEXT: NebulaState = {
  pageTitle: { title: 'Nebula' },
  currentChannelId: JSON.parse(localStorage.getItem(LS_KEY_CURRENT_CHANNEL) || 'null'),
  focusedAsset: null,
  selectedAssets: [],
};

interface NebulaProviderProps {
  children: React.ReactNode;
}

export const NebulaProvider: React.FC<NebulaProviderProps> = ({
  children,
}: NebulaProviderProps) => {
  const [nebulaState, setNebulaState] = useState(DEFAULT_NEBULA_CONTEXT);

  const setSelectedAssets = useCallback((assetIds: number[]) => {
    setNebulaState((prev) => ({ ...prev, selectedAssets: assetIds }));
  }, []);

  const setFocusedAsset = useCallback((assetId: number | null) => {
    if (isNaN(assetId || 0) || assetId == 0) {
      assetId = null;
    }
    setNebulaState((prev) => ({ ...prev, focusedAsset: assetId }));
  }, []);

  const setPageTitle = useCallback((title: string, icon?: string) => {
    setNebulaState((prev) => ({ ...prev, pageTitle: { title, icon } }));
    window.document.title = `${title} | NEBULA`;
  }, []);

  const setCurrentChannel = useCallback((channelId: number | null) => {
    localStorage.setItem(LS_KEY_CURRENT_CHANNEL, JSON.stringify(channelId));
    setNebulaState((prev) => ({ ...prev, currentChannelId: channelId }));
  }, []);

  const contextValue: NebulaContextType = {
    ...nebulaState,
    setSelectedAssets,
    setFocusedAsset,
    setPageTitle,
    setCurrentChannel,
  };

  return (
    <NebulaContext.Provider value={contextValue}>{children}</NebulaContext.Provider>
  );
};
