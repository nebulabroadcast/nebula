import nebula from '/src/nebula'
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  currentView: JSON.parse(localStorage.getItem('currentView') || 'null'),
  searchQuery: '',
  selectedAssets: [],
  focusedAsset: null,
  pageTitle: '',
}

const contextSlice = createSlice({
  name: 'context',
  initialState,

  reducers: {
    setCurrentView: (state, action) => {
      state.currentView = action.payload
      localStorage.setItem('currentView', JSON.stringify(action.payload))
      return state
    },

    setCurrentViewId: (state, action) => {
      const view = nebula.settings.views.find((v) => v.id === action.payload)
      if (view) {
        state.currentView = view
        localStorage.setItem('currentView', JSON.stringify(view))
      }
      return state
    },


    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload
      return state
    },

    setSelectedAssets: (state, action) => {
      state.selectedAssets = action.payload
      return state
    },

    setFocusedAsset: (state, action) => {
      state.focusedAsset = action.payload
    },

    setPageTitle: (state, action) => {
      state.pageTitle = action.payload.title
      state.pageIcon = action.payload.icon
      window.document.title = `${action.payload.title} | NEBULA`
    },
  },
})

export const {
  setCurrentView,
  setCurrentViewId,
  setSearchQuery,
  setSelectedAssets,
  setFocusedAsset,
  setPageTitle,
} = contextSlice.actions

export default contextSlice.reducer
