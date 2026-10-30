import type { FilterCondition } from '@/client';

export type FilterOp = NonNullable<FilterCondition['op']>;

// One condition of a tab or a user view, ANDed with the others
export interface Condition {
  key: string;
  op: FilterOp;
  value?: unknown;
}

// "site:<id>" for a view from the site settings, "user:<id>" for a user view
export type ViewKey = string;

// What a tab keeps in localStorage. Rows, scroll position and selection
// live only while the page is open.
export interface TabSettings {
  id: string;
  view: ViewKey;
  conditions: Condition[];
  query: string;
  // Sort key, '-' prefix for descending
  sort: string;
  // Columns chosen for this tab; the view's when not set
  columns?: string[] | null;
}

// A site or a user view, as tabs use it. A tab that picks the view gets
// a copy of its conditions (a site view's folders and states), query and
// sort, and can change them.
export interface BrowserView {
  key: ViewKey;
  name: string;
  columns: string[];
  conditions: Condition[];
  query: string;
  sort: string;
}

// A tab saved by the user (localStorage)
export type UserView = Omit<BrowserView, 'key'> & {
  id: string;
  columnWidths: Record<string, number>;
};
