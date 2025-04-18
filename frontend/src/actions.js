import nebula from '/src/nebula';

import { createSlice } from '@reduxjs/toolkit';
import { isNaN } from 'lodash';

const initialState = {
  browserRefresh: 0,
  currentView: JSON.parse(localStorage.getItem('currentView') || 'null'),
  searchQuery: JSON.parse(localStorage.getItem('searchQuery') || '""'),
  selectedAssets: [],
  focusedAsset: null,
  pageTitle: '',
  currentChannel: JSON.parse(localStorage.getItem('currentChannel') || 'null'),
};

const contextSlice = createSlice({
  name: 'context',
  initialState,

  reducers: {
    setCurrentView: (state, action) => {
      state.currentView = action.payload;
      localStorage.setItem('currentView', JSON.stringify(action.payload));
      return state;
    },

    setCurrentViewId: (state, action) => {
      const view = nebula.settings.views.find((v) => v.id === action.payload);
      if (view) {
        state.currentView = view;
        localStorage.setItem('currentView', JSON.stringify(view));
      }
      return state;
    },

    reloadBrowser: (state, action) => {
      const _a = action;
      state.browserRefresh = state.browserRefresh + 1;
      return state;
    },

    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      localStorage.setItem('searchQuery', JSON.stringify(action.payload));
      return state;
    },

    setSelectedAssets: (state, action) => {
      state.selectedAssets = action.payload;
      return state;
    },

    setFocusedAsset: (state, action) => {
      if (isNaN(action.payload)) return;
      state.focusedAsset = action.payload;
    },

    setPageTitle: (state, action) => {
      state.pageTitle = action.payload.title;
      state.pageIcon = action.payload.icon;
      window.document.title = `${action.payload.title} | NEBULA`;
    },

    setCurrentChannel: (state, action) => {
      state.currentChannel = action.payload;
      localStorage.setItem('currentChannel', JSON.stringify(action.payload));
      return state;
    },
  },
});

export const {
  reloadBrowser,
  setCurrentView,
  setCurrentViewId,
  setSearchQuery,
  setSelectedAssets,
  setFocusedAsset,
  setPageTitle,
  setCurrentChannel,
} = contextSlice.actions;

export default contextSlice.reducer;
