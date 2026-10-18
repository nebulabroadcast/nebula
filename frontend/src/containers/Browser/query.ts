import type { BrowserView, Condition, TabSettings, UserView, ViewKey } from './types';

import type { FilterCondition, QueryRequest } from '@/client';
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
    return {
      key,
      name: view.name,
      folders: view.folders ?? null,
      states: view.states ?? null,
      columns: view.columns?.length ? view.columns : DEFAULT_COLUMNS,
      conditions: [],
      query: '',
      sort: DEFAULT_SORT,
    };
  }
  const view = userViews.find((v) => v.id === id);
  if (!view) return null;
  return { ...view, key };
};

// The view's folders, states and conditions, and the tab's conditions
export const tabFilter = (
  view: BrowserView,
  conditions: Condition[]
): QueryRequest['filter'] => {
  const and: FilterCondition[] = [];
  if (view.folders?.length)
    and.push({ key: 'id_folder', op: 'in', value: view.folders });
  if (view.states?.length) and.push({ key: 'status', op: 'in', value: view.states });
  and.push(...view.conditions, ...conditions);
  return and.length ? { and } : null;
};

export const tabRequest = (view: BrowserView, tab: TabSettings): QueryRequest => {
  const fields = new Set([...REQUIRED_FIELDS, ...view.columns]);
  if (fields.has('duration')) {
    fields.add('mark_in');
    fields.add('mark_out');
  }
  return {
    filter: tabFilter(view, tab.conditions),
    q: [view.query, tab.query].join(' ').trim() || null,
    sort: [tab.sort],
    fields: [...fields],
    limit: PAGE_SIZE,
  };
};
