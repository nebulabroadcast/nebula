import { useNebula } from '@features/Nebula';
import { useLocalStorage } from '@lib/useLocalStorage';
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { BrowserContext, type BrowserContextType } from './context';
import {
  firstSiteView,
  resolveView,
  userViewId,
  userViewKey,
  userViewSettings,
  viewTab,
} from './query';
import type { Condition, TabSettings, UserView, ViewKey } from './types';

const NO_TABS: TabSettings[] = [];
const NO_USER_VIEWS: UserView[] = [];
const NO_WIDTHS: Record<ViewKey, Record<string, number>> = {};

const newTab = (settings: Omit<TabSettings, 'id'>, id?: string): TabSettings => ({
  id: id ?? uuidv4(),
  ...settings,
});

// Tabs whose view is gone (site settings changed, user view deleted) show
// the first site view. There is always a tab, unless there are no views.
const validTabs = (tabs: TabSettings[], userViews: UserView[]): TabSettings[] => {
  const fallback = firstSiteView();
  if (!fallback) return [];
  const result = tabs.map((tab) =>
    resolveView(tab.view, userViews) ? tab : { ...tab, view: fallback }
  );
  if (result.length) return result;
  const view = resolveView(fallback, userViews);
  return view ? [newTab(viewTab(view), 'default')] : [];
};

export const BrowserProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedAssets, setSelectedAssets } = useNebula();
  const [storedTabs, setStoredTabs] = useLocalStorage('mam.browser.tabs', NO_TABS);
  const [storedActiveId, setActiveId] = useLocalStorage<string | null>(
    'mam.browser.activeTab',
    null
  );
  const [userViews, setUserViews] = useLocalStorage(
    'mam.browser.userViews',
    NO_USER_VIEWS
  );
  const [siteWidths, setSiteWidths] = useLocalStorage('mam.browser.widths', NO_WIDTHS);
  const [selections, setSelections] = useState<Record<string, number[]>>({});
  const [newCounts, setNewCounts] = useState<Record<string, number>>({});
  const [reloads, setReloads] = useState<Record<string, number>>({});
  const [unsortable, setUnsortable] = useState<string[]>([]);

  const tabs = validTabs(storedTabs, userViews);
  const activeId =
    tabs.find((tab) => tab.id === storedActiveId)?.id ?? tabs[0]?.id ?? null;

  const setTabs = (update: (tabs: TabSettings[]) => TabSettings[]) => {
    setStoredTabs((prev) => update(validTabs(prev, userViews)));
  };

  const activateTab = (id: string) => {
    if (id === activeId) return;
    if (activeId) setSelections((prev) => ({ ...prev, [activeId]: selectedAssets }));
    setSelectedAssets(selections[id] ?? []);
    setActiveId(id);
  };

  const tabSelection = (id: string) =>
    id === activeId ? selectedAssets : (selections[id] ?? []);

  const setTabSelection = (id: string, ids: number[]) => {
    if (id === activeId) setSelectedAssets(ids);
    else setSelections((prev) => ({ ...prev, [id]: ids }));
  };

  // A view's settings (the active tab's view by default), with more
  // conditions
  const openTab = (viewKey?: ViewKey, conditions: Condition[] = []) => {
    const key = viewKey ?? tabs.find((tab) => tab.id === activeId)?.view;
    const view = resolveView(key ?? firstSiteView() ?? '', userViews);
    if (!view) return;
    const settings = viewTab(view);
    const tab = newTab({
      ...settings,
      conditions: [...settings.conditions, ...conditions],
    });
    setTabs((prev) => [...prev, tab]);
    activateTab(tab.id);
  };

  // The tab gets the view's conditions, query, sort and columns
  const selectView = (tabId: string, viewKey: ViewKey) => {
    const view = resolveView(viewKey, userViews);
    if (view) updateTab(tabId, viewTab(view));
  };

  const closeTab = (id: string) => {
    if (tabs.length < 2) return;
    const idx = tabs.findIndex((tab) => tab.id === id);
    if (id === activeId) activateTab(tabs[idx + 1]?.id ?? tabs[idx - 1].id);
    setTabs((prev) => prev.filter((tab) => tab.id !== id));
  };

  const updateTab: BrowserContextType['updateTab'] = (id, settings) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, ...settings } : tab))
    );
  };

  const reloadTab = (id: string) => {
    setReloads((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setNewCounts((prev) => ({ ...prev, [id]: 0 }));
  };

  const addNewCount = (id: string, count: number) => {
    setNewCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + count }));
  };

  const markUnsortable = (key: string) => {
    setUnsortable((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  //
  // Column widths: per site view here, user views keep their own
  //

  const columnWidths = (view: ViewKey) => {
    const id = userViewId(view);
    if (id !== null) return userViews.find((v) => v.id === id)?.columnWidths ?? {};
    return siteWidths[view] ?? {};
  };

  const setColumnWidth = (view: ViewKey, column: string, width: number | null) => {
    const widths = Object.fromEntries(
      Object.entries(columnWidths(view)).filter(([name]) => name !== column)
    );
    if (width !== null) widths[column] = width;
    const id = userViewId(view);
    if (id !== null) {
      setUserViews((prev) =>
        prev.map((v) => (v.id === id ? { ...v, columnWidths: widths } : v))
      );
    } else {
      setSiteWidths((prev) => ({ ...prev, [view]: widths }));
    }
  };

  //
  // User views
  //

  // Everything the tab shows; the tab then shows the new view
  const saveUserView = (tabId: string, name: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    const view = tab && resolveView(tab.view, userViews);
    if (!tab || !view) return;
    const userView: UserView = {
      id: uuidv4(),
      name,
      columnWidths: columnWidths(view.key),
      ...userViewSettings(view, tab),
    };
    setUserViews((prev) => [...prev, userView]);
    updateTab(tabId, { view: userViewKey(userView.id), columns: null });
  };

  // The tab's filters, search, sort and columns into its user view
  const updateUserView = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    const view = tab && resolveView(tab.view, userViews);
    const id = tab && userViewId(tab.view);
    if (!tab || !view || !id) return;
    const settings = userViewSettings(view, tab);
    setUserViews((prev) => prev.map((v) => (v.id === id ? { ...v, ...settings } : v)));
    updateTab(tabId, { columns: null });
  };

  const renameUserView = (id: string, name: string) => {
    setUserViews((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  };

  // Tabs showing it fall back to the first site view
  const deleteUserView = (id: string) => {
    setUserViews((prev) => prev.filter((v) => v.id !== id));
  };

  const value: BrowserContextType = {
    tabs,
    activeId,
    userViews,
    newCounts,
    reloads,
    unsortable,
    view: (tab) => resolveView(tab.view, userViews),
    openTab,
    selectView,
    closeTab,
    activateTab,
    updateTab,
    reloadTab,
    addNewCount,
    markUnsortable,
    tabSelection,
    setTabSelection,
    columnWidths,
    setColumnWidth,
    saveUserView,
    updateUserView,
    renameUserView,
    deleteUserView,
  };

  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
};
