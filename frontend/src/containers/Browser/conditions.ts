import type { Condition, FilterOp } from './types';

import nebula from '@/nebula';

export interface Operator {
  op: FilterOp;
  label: string;
  // exists: the value is fixed (true: is set, false: isn't)
  value?: boolean;
}

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

// The operators the listing accepts for a field (nebula/query/query.py,
// OPERATOR_KINDS), by its metatype
export const operatorsFor = (key: string): Operator[] => {
  switch (nebula.metaType(key).type) {
    case 'integer':
    case 'numeric':
    case 'datetime':
    case 'timecode':
    case 'color':
      return [...ORDERED, ...IS_SET];
    case 'boolean':
      return [{ op: 'eq', label: 'is' }];
    case 'select':
      return [...EQUAL, ...IS_SET];
    case 'list':
      return [{ op: 'contains', label: 'contains' }, ...IS_SET];
    case 'object':
      return IS_SET;
    default:
      return [...EQUAL, { op: 'ilike', label: 'contains' }, ...IS_SET];
  }
};

export const operatorOf = (condition: Condition): Operator | undefined =>
  operatorsFor(condition.key).find(
    (o) => o.op === condition.op && (o.op !== 'exists' || o.value === condition.value)
  );

// Fields conditions can be added for, in the filter input
export const filterableKeys = (): string[] =>
  Object.keys(nebula.settings?.metatypes || {}).filter(
    (key) => nebula.metaType(key).type !== 'object'
  );

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
  const keys = new Set(filterableKeys());
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

// Fulltext words only: what the query is while `key:value` is being typed
export const queryWords = (text: string): string => parseFilterInput(text).query;

const formatValue = (key: string, value: unknown): string => {
  if (Array.isArray(value)) return value.map((v) => formatValue(key, v)).join(', ');
  const metaType = nebula.metaType(key);
  if (metaType.cs) {
    const option = nebula.csOptions(metaType.cs).find((o) => o.value === value);
    if (option) return option.title;
  }
  if (key === 'id_folder')
    return nebula.getFolderName(value as number) || String(value);
  return typeof value === 'string' ? value : JSON.stringify(value);
};

export const conditionLabel = (condition: Condition): string => {
  const header = nebula.metaType(condition.key).header || condition.key;
  const operator = operatorOf(condition);
  if (condition.op === 'exists') return `${header} ${operator?.label}`;
  const value =
    condition.op === 'ilike'
      ? String(condition.value).replace(/^%|%$/g, '')
      : formatValue(condition.key, condition.value);
  return `${header} ${operator?.label ?? condition.op} ${value}`;
};
