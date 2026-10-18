import { createContext } from 'react';

import type { BrowserView, Condition, TabSettings, UserView, ViewKey } from './types';

export interface BrowserContextType {
  tabs: TabSettings[];
  activeId: string | null;
  userViews: UserView[];
  // Session state of the tabs, by tab id
  newCounts: Record<string, number>;
  reloads: Record<string, number>;
  // Fields the listing refused to sort by (no index), for this session
  unsortable: string[];

  view: (tab: TabSettings) => BrowserView | null;
  openTab: (view?: ViewKey, conditions?: Condition[]) => void;
  selectView: (tabId: string, view: ViewKey) => void;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
  updateTab: (id: string, settings: Partial<Omit<TabSettings, 'id'>>) => void;
  reloadTab: (id: string) => void;
  addNewCount: (id: string, count: number) => void;
  markUnsortable: (key: string) => void;

  // The active tab's selection is useNebula().selectedAssets (the editor,
  // rundown and scheduler use it); the others keep theirs here
  tabSelection: (id: string) => number[];
  setTabSelection: (id: string, ids: number[]) => void;

  columnWidths: (view: ViewKey) => Record<string, number>;
  setColumnWidth: (view: ViewKey, column: string, width: number | null) => void;

  saveUserView: (tabId: string, name: string) => void;
  renameUserView: (id: string, name: string) => void;
  deleteUserView: (id: string) => void;
}

export const BrowserContext = createContext<BrowserContextType | undefined>(undefined);
