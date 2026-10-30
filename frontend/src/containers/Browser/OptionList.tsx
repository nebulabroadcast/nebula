import clsx from 'clsx';
import { useState } from 'react';

import type { ValueOption } from './conditions';

// Lists longer than this get a search input
const SEARCH_FROM = 12;

const parentOf = (value: string) => value.slice(0, Math.max(0, value.lastIndexOf('.')));

// "3.10" after "3.9": numeric levels compared as numbers
const compareLevels = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

// Labels and headers only group the values under them
const pickable = (option: ValueOption) => !option.role || option.role === 'option';

interface OptionListProps {
  options: ValueOption[];
  // Picks several values; otherwise one
  multi: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
}

// Values to pick from. Hierarchical values ("3.4.6" under "3.4" under "3")
// are a tree: a picked value includes everything under it, so its
// descendants show as included
const OptionList = ({
  options: allOptions,
  multi,
  value,
  onChange,
}: OptionListProps) => {
  const options = allOptions.filter((option) => option.role !== 'hidden');
  const selected = multi ? ((value as unknown[] | undefined) ?? []) : [value];
  const hierarchical = options.some((o) => String(o.value).includes('.'));
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Open down to what's picked
    const open = new Set<string>();
    for (const v of selected) {
      for (let p = parentOf(String(v)); p; p = parentOf(p)) open.add(p);
    }
    return open;
  });

  const toggleOpen = (v: string) => {
    const next = new Set(expanded);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setExpanded(next);
  };

  const toggle = (option: ValueOption) => {
    if (!multi) onChange(option.value);
    else if (selected.includes(option.value)) {
      onChange(selected.filter((v) => v !== option.value));
    } else {
      // what's under it is included already
      const under = `${String(option.value)}.`;
      onChange([...selected.filter((v) => !String(v).startsWith(under)), option.value]);
    }
  };

  const word = search.trim().toLowerCase();
  const matches = (option: ValueOption) =>
    !word || option.title.toLowerCase().includes(word);

  const searchInput = options.length > SEARCH_FROM && (
    <input
      className="nb-input option-search"
      placeholder="Find a value"
      value={search}
      onChange={(event) => {
        setSearch(event.target.value);
      }}
    />
  );

  if (!hierarchical) {
    return (
      <>
        {searchInput}
        <div className="options">
          {options.filter(matches).map((option) => (
            <button
              key={String(option.value)}
              className={clsx(selected.includes(option.value) && 'on')}
              disabled={!pickable(option)}
              onClick={() => {
                toggle(option);
              }}
            >
              {option.title}
            </button>
          ))}
        </div>
      </>
    );
  }

  const values = new Set(options.map((o) => String(o.value)));
  const sorted = [...options].sort((a, b) =>
    compareLevels(String(a.value), String(b.value))
  );
  const hasChildren = new Set(sorted.map((o) => parentOf(String(o.value))));
  const depthOf = (v: string) => {
    let depth = 0;
    for (let p = parentOf(v); p; p = parentOf(p)) if (values.has(p)) depth++;
    return depth;
  };
  const includedBy = (v: string) => {
    for (let p = parentOf(v); p; p = parentOf(p)) if (selected.includes(p)) return p;
    return null;
  };

  // Searching shows the matches with their ancestors; otherwise the
  // expanded branches
  const shown = new Set<string>();
  for (const option of sorted) {
    const v = String(option.value);
    if (word) {
      if (!matches(option)) continue;
      for (let p: string = v; p; p = parentOf(p)) shown.add(p);
    } else {
      let open = true;
      for (let p = parentOf(v); p; p = parentOf(p)) {
        if (values.has(p) && !expanded.has(p)) open = false;
      }
      if (open) shown.add(v);
    }
  }

  return (
    <>
      {searchInput}
      <div className="option-tree">
        {sorted
          .filter((option) => shown.has(String(option.value)))
          .map((option) => {
            const v = String(option.value);
            const parent = includedBy(v);
            const on = selected.includes(option.value);
            const open = !!word || expanded.has(v);
            const isLabel = !pickable(option);
            return (
              <div
                key={v}
                className={clsx('option', on && 'on', parent && 'included')}
                style={{ paddingLeft: 4 + depthOf(v) * 14 }}
                title={parent ? 'Included with its parent' : undefined}
              >
                <span
                  className={clsx(
                    'icon material-symbols-outlined chevron',
                    !hasChildren.has(v) && 'leaf'
                  )}
                  translate="no"
                  onClick={() => {
                    toggleOpen(v);
                  }}
                >
                  {open ? 'expand_more' : 'chevron_right'}
                </span>
                <button
                  className={clsx(isLabel && 'label')}
                  disabled={!!parent}
                  onClick={() => {
                    if (isLabel) toggleOpen(v);
                    else toggle(option);
                  }}
                >
                  {!isLabel && (
                    <span className="icon material-symbols-outlined" translate="no">
                      {on || parent ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  )}
                  {option.title}
                </button>
              </div>
            );
          })}
      </div>
    </>
  );
};

export default OptionList;
