import { Button } from '@components';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import { lastWord, parseFilterInput, type Draft } from './conditions';
import FilterPopover from './FilterPopover';
import type { Condition, TabSettings } from './types';
import { useBrowser } from './useBrowser';

// Conditions with the same key are replaced
const mergeConditions = (current: Condition[], added: Condition[]): Condition[] => [
  ...current.filter((c) => !added.some((a) => a.key === c.key)),
  ...added,
];

// The search input of a tab. Focusing it opens the filter popover, which
// shows the tab's filters
const BrowserFilterBar = ({ tab }: { tab: TabSettings }) => {
  const browser = useBrowser();
  const view = browser.view(tab);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(tab.query);
  const [draft, setDraftState] = useState<Draft | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [pickColumn, setPickColumn] = useState(false);
  // Backspace in the empty input marks the last filter, a second removes it
  const [armed, setArmed] = useState(false);
  // Row of the popover chosen with the arrow keys (-1: none, 'fields':
  // the first of the field list, where typing starts)
  const [highlight, setHighlight] = useState<number | 'fields'>(-1);

  const setDraft = (next: Draft | null, index: number | null = null) => {
    setDraftState(next);
    setEditIndex(next ? index : null);
  };

  const close = (query = tab.query) => {
    setOpen(false);
    setDraft(null);
    setPickColumn(false);
    setArmed(false);
    setHighlight(-1);
    setText(query);
    inputRef.current?.blur();
  };

  // `key:value` words become conditions, the rest is the search
  const search = () => {
    const { conditions, query } = parseFilterInput(text);
    browser.updateTab(tab.id, {
      conditions: mergeConditions(tab.conditions, conditions),
      query,
    });
    close(query);
  };

  // Closed by a click anywhere else
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
    };
  });

  // Rows of the popover the arrow keys walk: filters and fields, then views
  const rows = () =>
    ['.main', '.views'].flatMap((column) => [
      ...(wrapperRef.current?.querySelectorAll<HTMLElement>(`${column} [data-nav]`) ??
        []),
    ]);

  const highlighted = () =>
    highlight === 'fields'
      ? rows().findIndex((row) => row.closest('.fields'))
      : highlight;

  // The highlighted row, marked after every render (rows change with it)
  useEffect(() => {
    const current = highlighted();
    rows().forEach((row, idx) => row.classList.toggle('hi', idx === current));
  });

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const count = rows().length;
      if (!count) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight((highlighted() + step + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows()[highlighted()] as HTMLElement | undefined;
      if (row) row.click();
      else search();
      setHighlight(-1);
    } else if (event.key === 'Escape') {
      if (draft || pickColumn) {
        setDraft(null);
        setPickColumn(false);
      } else {
        close();
      }
    } else if (event.key === 'Backspace' && !text && tab.conditions.length) {
      if (armed) {
        browser.updateTab(tab.id, { conditions: tab.conditions.slice(0, -1) });
        setArmed(false);
      } else {
        setArmed(true);
      }
    } else {
      setArmed(false);
    }
  };

  // Back to the view's filters and no search
  const differs =
    tab.query !== (view?.query ?? '') ||
    JSON.stringify(tab.conditions) !== JSON.stringify(view?.conditions ?? []);

  return (
    <div className="filter-row" ref={wrapperRef}>
      <div
        className={clsx('filter-bar', open && 'open')}
        onMouseDown={(event) => {
          if (event.target !== inputRef.current) event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          value={text}
          placeholder={open ? 'Search, or type a field name' : 'Search or filter'}
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value);
            setArmed(false);
            setHighlight(event.target.value.trim() ? 'fields' : -1);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {differs && (
          <Button
            icon="close"
            className="tool"
            tooltip="Back to the view's filters"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={() => {
              browser.updateTab(tab.id, {
                conditions: view?.conditions ?? [],
                query: view?.query ?? '',
              });
              close(view?.query ?? '');
            }}
          />
        )}
      </div>
      <Button
        icon="refresh"
        className="tool"
        tooltip="Reload"
        onClick={() => {
          browser.reloadTab(tab.id);
        }}
      />
      {open && (
        <FilterPopover
          tab={tab}
          text={text}
          draft={draft}
          editIndex={editIndex}
          armed={armed}
          pickColumn={pickColumn}
          setDraft={(next, index) => {
            setDraft(next, index);
            setHighlight(-1);
            // the field name typed to find it goes
            if (next)
              setText(text.slice(0, text.length - lastWord(text).length).trimEnd());
          }}
          setPickColumn={(on) => {
            setPickColumn(on);
            setHighlight(-1);
            inputRef.current?.focus();
          }}
          onSearch={search}
          onClose={() => {
            close();
          }}
        />
      )}
    </div>
  );
};

export default BrowserFilterBar;
