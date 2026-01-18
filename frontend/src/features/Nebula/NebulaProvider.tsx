import React, { createContext, useState } from 'react';

export interface NebulaState {
  browserRefresh: number;
  currentView: number;
  selectedAssets: number[];
  searchQuery: string;
  focusedAsset: number | null;
  pageTitle: string;
  currentChannel: number | null;
}

export interface NebulaContextType extends NebulaState {
  setCurrentView: (viewId: number) => void;
  reloadBrowser: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedAssets: (assetIds: number[]) => void;
  setFocusedAsset: (assetId: number | null) => void;
  setPageTitle: (title: string) => void;
  setCurrentChannel: (channelId: number | null) => void;
}

const DEFAULT_NEBULA_CONTEXT: NebulaState = {
  browserRefresh: 0,
  currentView: JSON.parse(localStorage.getItem('currentView') || 'null'),
  searchQuery: JSON.parse(localStorage.getItem('searchQuery') || '""'),
  selectedAssets: [],
  focusedAsset: null,
  pageTitle: '',
  currentChannel: JSON.parse(localStorage.getItem('currentChannel') || 'null'),
};

export const NebulaContext = createContext<NebulaContextType | undefined>(undefined);

interface NebulaProviderProps {
  children: React.ReactNode;
}

export const NebulaProvider: React.FC<NebulaProviderProps> = ({
  children,
}: NebulaProviderProps) => {
  const [nebulaState, setNebulaState] = useState<NebulaState>(DEFAULT_NEBULA_CONTEXT);

  const setCurrentView = (viewId: number) => {
    localStorage.setItem('currentView', JSON.stringify(viewId));
    setNebulaState((prev) => ({ ...prev, currentView: viewId }));
  };

  const reloadBrowser = () => {
    setNebulaState((prev) => ({ ...prev, browserRefresh: prev.browserRefresh + 1 }));
  };

  const setSearchQuery = (query: string) => {
    localStorage.setItem('searchQuery', JSON.stringify(query));
    setNebulaState((prev) => ({ ...prev, searchQuery: query }));
  };

  const setSelectedAssets = (assetIds: number[]) => {
    setNebulaState((prev) => ({ ...prev, selectedAssets: assetIds }));
  };

  const setFocusedAsset = (assetId: number | null) => {
    setNebulaState((prev) => ({ ...prev, focusedAsset: assetId }));
  };

  const setPageTitle = (title: string) => {
    setNebulaState((prev) => ({ ...prev, pageTitle: title }));
  };

  const setCurrentChannel = (channelId: number | null) => {
    localStorage.setItem('currentChannel', JSON.stringify(channelId));
    setNebulaState((prev) => ({ ...prev, currentChannel: channelId }));
  };

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
