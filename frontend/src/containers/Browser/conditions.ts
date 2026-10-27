import type { Condition, FilterOp } from './types';

import { ContentType, MediaType, ObjectStatus } from '@/client';
import nebula from '@/nebula';

export interface Operator {
  op: FilterOp;
  label: string;
  // exists: the value is fixed (true: is set, false: isn't)
  value?: boolean;
  // The value is a list
  multi?: boolean;
}

export interface ValueOption {
  value: string | number | boolean;
  title: string;
}

// Values of the asset enums that make sense when filtering assets
// (aired, unknown or remote aren't asset states)
const ENUM_OPTIONS: Record<string, ValueOption[]> = {
  status: [
    { value: ObjectStatus.OFFLINE, title: 'offline' },
    { value: ObjectStatus.ONLINE, title: 'online' },
    { value: ObjectStatus.CREATING, title: 'creating' },
    { value: ObjectStatus.TRASHED, title: 'trashed' },
    { value: ObjectStatus.ARCHIVED, title: 'archived' },
    { value: ObjectStatus.RESET, title: 'reset' },
    { value: ObjectStatus.CORRUPTED, title: 'corrupted' },
    { value: ObjectStatus.ONAIR, title: 'on air' },
    { value: ObjectStatus.RETRIEVING, title: 'retrieving' },
  ],
  content_type: [
    { value: ContentType.VIDEO, title: 'video' },
    { value: ContentType.AUDIO, title: 'audio' },
    { value: ContentType.IMAGE, title: 'image' },
    { value: ContentType.TEXT, title: 'text' },
    { value: ContentType.DATABROADCASTING, title: 'data broadcasting' },
  ],
  media_type: [
    { value: MediaType.FILE, title: 'file' },
    { value: MediaType.VIRTUAL, title: 'virtual' },
  ],
};

// The values a field can have, when they are a fixed list: folders,
// asset enums, classifications
export const valueOptions = (key: string): ValueOption[] | null => {
  if (key === 'id_folder') {
    return (nebula.settings?.folders || []).map((f) => ({
      value: f.id,
      title: f.name,
    }));
  }
  if (key in ENUM_OPTIONS) return ENUM_OPTIONS[key];
  const cs = nebula.metaType(key).cs;
  return cs
    ? nebula.csOptions(cs).map((o) => ({ value: o.value, title: o.title }))
    : null;
};

const IS_SET: Operator[] = [
  { op: 'exists', label: 'is set', value: true },
  { op: 'exists', label: 'is not set', value: false },
];
const EQUAL: Operator[] = [
  { op: 'eq', label: 'is' },
  { op: 'ne', label: 'is not' },
];
const ORDERED: Operator[] = [
  ...EQUAL,
  { op: 'lt', label: '<' },
  { op: 'lte', label: '≤' },
  { op: 'gt', label: '>' },
  { op: 'gte', label: '≥' },
];

// Classifications with levels ("3.4.6" is under "3.4", under "3"). Their
// "is any of" matches everything under the picked values (query.ts)
export const isHierarchical = (key: string): boolean =>
  nebula.metaType(key).type !== 'list' &&
  !!valueOptions(key)?.some((option) => String(option.value).includes('.'));

const ANY_OF: Operator[] = [
  { op: 'in', label: 'is any of', multi: true },
  { op: 'nin', label: 'is none of', multi: true },
];

// The operators the listing accepts for a field (nebula/query/query.py,
// OPERATOR_KINDS), by its metatype
export const operatorsFor = (key: string): Operator[] => {
  const type = nebula.metaType(key).type;
  if (type === 'list')
    return [{ op: 'contains', label: 'contains', multi: true }, ...IS_SET];
  if (isHierarchical(key)) return [...ANY_OF, ...IS_SET];
  if (valueOptions(key)) return [...EQUAL, ...ANY_OF, ...IS_SET];
  switch (type) {
    case 'integer':
    case 'numeric':
    case 'datetime':
    case 'timecode':
    case 'color':
      return [...ORDERED, ...IS_SET];
    case 'boolean':
      return [{ op: 'eq', label: 'is' }];
    case 'object':
      return IS_SET;
    default:
      // the first is the default
      return [{ op: 'ilike', label: 'contains' }, ...EQUAL, ...IS_SET];
  }
};

export const operatorOf = (condition: Condition): Operator | undefined =>
  operatorsFor(condition.key).find(
    (o) => o.op === condition.op && (o.op !== 'exists' || o.value === condition.value)
  );

// Asset fields, as the backend has them (nebula/objects/asset/keys.py):
// the asset namespaces, the asset keys of "o", and virtual fields of
// assets ("va")
const ASSET_NAMESPACES = ['a', 'ai', 'f', 'm', 'q', 'va'];
const ASSET_OBJECT_KEYS = [
  'id',
  'id_folder',
  'created_by',
  'updated_by',
  'ctime',
  'mtime',
];

// Asset fields that can be filtered by or shown as columns
export const assetKeys = (): string[] =>
  Object.keys(nebula.settings?.metatypes || {}).filter((key) => {
    const { ns, type } = nebula.metaType(key);
    if (type === 'object') return false;
    return ASSET_NAMESPACES.includes(ns ?? '') || ASSET_OBJECT_KEYS.includes(key);
  });

// A value typed as text (`key:value` in the filter input) as the field
// expects it
export const parseValue = (key: string, text: string): unknown => {
  switch (nebula.metaType(key).type) {
    case 'integer':
    case 'numeric':
    case 'color':
    case 'datetime':
    case 'timecode': {
      const number = Number(text);
      return isNaN(number) ? text : number;
    }
    case 'boolean':
      return ['1', 'true', 'yes'].includes(text.toLowerCase());
    default:
      return text;
  }
};

// `key:value` words of the filter input become conditions, the rest is
// the fulltext query
export const parseFilterInput = (
  text: string
): { conditions: Condition[]; query: string } => {
  const conditions: Condition[] = [];
  const words: string[] = [];
  const keys = new Set(assetKeys());
  for (const word of text.split(/\s+/)) {
    const [key, value] = word.split(/:(.*)/s, 2);
    if (value && keys.has(key)) {
      const op = nebula.metaType(key).type === 'list' ? 'contains' : 'eq';
      const parsed = parseValue(key, value);
      conditions.push({ key, op, value: op === 'contains' ? [parsed] : parsed });
    } else if (word) {
      words.push(word);
    }
  }
  return { conditions, query: words.join(' ') };
};

// The word being typed at the end of the filter input
export const lastWord = (text: string): string => text.split(/\s+/).at(-1) ?? '';

const formatValue = (key: string, value: unknown): string => {
  if (Array.isArray(value)) return value.map((v) => formatValue(key, v)).join(', ');
  const option = valueOptions(key)?.find((o) => o.value === value);
  if (option) return option.title;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return typeof value === 'string' ? value : JSON.stringify(value);
};

// What a condition shows: "Genre", "is any of", "Action, Comedy"
export const conditionParts = (condition: Condition) => {
  const field = nebula.metaType(condition.key).title || condition.key;
  const operator = operatorOf(condition)?.label ?? condition.op;
  if (condition.op === 'exists') return { field, operator, value: '' };
  const value =
    condition.op === 'ilike'
      ? String(condition.value).replace(/^%|%$/g, '')
      : formatValue(condition.key, condition.value);
  return { field, operator, value };
};

// A condition being added or edited in the filter popover
export interface Draft {
  key: string;
  operator: Operator;
  value?: unknown;
}

export const newDraft = (key: string): Draft => ({
  key,
  operator: operatorsFor(key)[0],
  value: nebula.metaType(key).type === 'boolean' ? true : undefined,
});

export const draftOf = (condition: Condition): Draft => ({
  key: condition.key,
  operator: operatorOf(condition) ?? operatorsFor(condition.key)[0],
  value:
    condition.op === 'ilike'
      ? String(condition.value).replace(/^%|%$/g, '')
      : condition.value,
});

// The value kept when the operator changes between one value and a list
export const withOperator = (draft: Draft, operator: Operator): Draft => {
  const values = Array.isArray(draft.value) ? draft.value : [draft.value];
  const defined = values.filter((v) => v !== undefined);
  return {
    ...draft,
    operator,
    value: operator.multi ? defined : defined[0],
  };
};

// The condition, or null while the value is missing
export const conditionOf = ({ key, operator, value }: Draft): Condition | null => {
  if (operator.op === 'exists') return { key, op: 'exists', value: operator.value };
  if (operator.multi) {
    return Array.isArray(value) && value.length
      ? { key, op: operator.op, value }
      : null;
  }
  if (value === undefined || value === '' || Number.isNaN(value)) return null;
  if (operator.op === 'ilike')
    return { key, op: 'ilike', value: `%${value as string}%` };
  return { key, op: operator.op, value };
};
