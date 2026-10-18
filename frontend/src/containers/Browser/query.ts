import type { BrowserView, Condition, TabSettings, UserView, ViewKey } from './types';

import type { QueryRequest } from '@/client';
import nebula from '@/nebula';

export const PAGE_SIZE = 200;
export const DEFAULT_SORT = '-ctime';
const DEFAULT_COLUMNS = ['title', 'duration'];

// Fields the browser needs besides the view's columns (row colors,
// subtitles, drag and drop). As RPC browse's REQUIRED_COLUMNS
const REQUIRED_FIELDS = [
  'id',
  'id_folder',
  'title',
  'subtitle',
  'status',
  'content_type',
  'media_type',
  'ctime',
  'mtime',
  'video/fps_f',
  'subclips',
];

export const siteViewKey = (id: number): ViewKey => `site:${id}`;
export const userViewKey = (id: string): ViewKey => `user:${id}`;

export const firstSiteView = (): ViewKey | null => {
  const view = nebula.settings?.views?.[0];
  return view ? siteViewKey(view.id) : null;
};

export const resolveView = (
  key: ViewKey,
  userViews: UserView[]
): BrowserView | null => {
  const [kind, id] = key.split(':', 2);
  if (kind === 'site') {
    const view = nebula.settings?.views?.find((v) => v.id === Number(id));
    if (!view) return null;
    const conditions: Condition[] = [];
    if (view.folders?.length) {
      conditions.push({ key: 'id_folder', op: 'in', value: view.folders });
    }
    if (view.states?.length) {
      conditions.push({ key: 'status', op: 'in', value: view.states });
    }
    return {
      key,
      name: view.name,
      columns: view.columns?.length ? view.columns : DEFAULT_COLUMNS,
      conditions,
      query: '',
      sort: DEFAULT_SORT,
    };
  }
  const view = userViews.find((v) => v.id === id);
  if (!view) return null;
  return { ...view, key };
};

// The settings of a tab showing the view
export const viewTab = (view: BrowserView): Omit<TabSettings, 'id'> => ({
  view: view.key,
  conditions: view.conditions,
  query: view.query,
  sort: view.sort,
  columns: null,
});

export const tabColumns = (view: BrowserView, tab: TabSettings): string[] =>
  tab.columns?.length ? tab.columns : view.columns;

export const tabRequest = (view: BrowserView, tab: TabSettings): QueryRequest => {
  const fields = new Set([...REQUIRED_FIELDS, ...tabColumns(view, tab)]);
  if (fields.has('duration')) {
    fields.add('mark_in');
    fields.add('mark_out');
  }
  return {
    filter: tab.conditions.length ? { and: tab.conditions } : null,
    q: tab.query || null,
    sort: [tab.sort],
    fields: [...fields],
    limit: PAGE_SIZE,
  };
};
