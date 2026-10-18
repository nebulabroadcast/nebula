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
}

// A tab saved by the user (localStorage)
export interface UserView {
  id: string;
  name: string;
  folders: number[] | null;
  states: number[] | null;
  columns: string[];
  columnWidths: Record<string, number>;
  conditions: Condition[];
  query: string;
  sort: string;
}

// A site or a user view, as tabs use it
export interface BrowserView {
  key: ViewKey;
  name: string;
  folders: number[] | null;
  states: number[] | null;
  columns: string[];
  // A user view's conditions and query; tabs add their own
  conditions: Condition[];
  query: string;
  sort: string;
}
