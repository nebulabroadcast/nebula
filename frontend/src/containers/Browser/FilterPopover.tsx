import clsx from 'clsx';

import ColumnList from './ColumnList';
import {
  assetKeys,
  conditionOf,
  conditionParts,
  draftOf,
  lastWord,
  newDraft,
  operatorsFor,
  withOperator,
  type Draft,
} from './conditions';
import { Pop } from './popoverStyles';
import { tabColumns } from './query';
import type { TabSettings } from './types';
import { useBrowser } from './useBrowser';
import ValueInput from './ValueInput';
import ViewList, { Icon } from './ViewList';

import nebula from '@/nebula';

export type PopoverMode = 'filters' | 'columns';

interface FilterPopoverProps {
  tab: TabSettings;
  // Typed in the bar: narrows the fields, or is the search
  text: string;
  mode: PopoverMode;
  draft: Draft | null;
  editIndex: number | null;
  armed: boolean;
  setMode: (mode: PopoverMode) => void;
  setDraft: (draft: Draft | null, editIndex?: number | null) => void;
  // A field was picked from the list (as a column)
  onPicked: () => void;
  onSearch: () => void;
  onClose: () => void;
}

// What the tab shows: its view (left), and its filters or its columns.
// Rows with data-nav can be walked with the arrow keys from the bar
// (BrowserFilterBar): those of the mode first, then the views
const FilterPopover = ({
  tab,
  text,
  mode,
  draft,
  editIndex,
  armed,
  setMode,
  setDraft,
  onPicked,
  onSearch,
  onClose,
}: FilterPopoverProps) => {
  const browser = useBrowser();
  const view = browser.view(tab);
  if (!view) return null;
  const columns = tabColumns(view, tab);

  const setConditions = (conditions: TabSettings['conditions']) => {
    browser.updateTab(tab.id, { conditions });
  };

  const setColumns = (names: string[]) => {
    browser.updateTab(tab.id, { columns: names });
  };

  const commit = () => {
    const condition = draft && conditionOf(draft);
    if (!condition) return;
    setConditions(
      editIndex === null
        ? [...tab.conditions, condition]
        : tab.conditions.map((c, i) => (i === editIndex ? condition : c))
    );
    setDraft(null);
  };

  //
  // Filters
  //

  const conditionRows = tab.conditions.map((condition, idx) => {
    const { field, operator, value } = conditionParts(condition);
    return (
      <button
        key={idx}
        data-nav
        className={clsx(
          'it',
          armed && idx === tab.conditions.length - 1 && 'armed',
          editIndex === idx && 'current'
        )}
        title="Edit"
        onClick={() => {
          setDraft(draftOf(condition), idx);
        }}
      >
        <span>{field}</span>
        <span className="dim">{operator}</span>
        <span className="grow">{value}</span>
        <span
          title="Remove"
          onClick={(event) => {
            event.stopPropagation();
            setConditions(tab.conditions.filter((_, i) => i !== idx));
            if (editIndex === idx) setDraft(null);
          }}
        >
          <Icon name="close" className="remove" />
        </span>
      </button>
    );
  });

  const form = draft && (
    <div
      className="form"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setDraft(null);
      }}
    >
      <div className="row">
        <strong>{nebula.metaType(draft.key).title}</strong>
        <div className="operators">
          {operatorsFor(draft.key).map((operator) => (
            <button
              key={operator.label}
              className={clsx(operator.label === draft.operator.label && 'on')}
              onClick={() => {
                setDraft(withOperator(draft, operator), editIndex);
              }}
            >
              {operator.label}
            </button>
          ))}
        </div>
      </div>
      <ValueInput
        draft={draft}
        onChange={(value) => {
          setDraft({ ...draft, value }, editIndex);
        }}
        onSubmit={commit}
      />
      <div className="row end">
        <button
          className="it"
          style={{ width: 'auto' }}
          onClick={() => {
            setDraft(null);
          }}
        >
          Cancel
        </button>
        <button
          className="it"
          style={{ width: 'auto' }}
          disabled={!conditionOf(draft)}
          onClick={commit}
        >
          <Icon name="check" />
          {editIndex === null ? 'Add filter' : 'Update'}
        </button>
      </div>
    </div>
  );

  //
  // Fields matching the word being typed: to filter by, or to add as a
  // column
  //

  const word = lastWord(text).toLowerCase();
  const fields = assetKeys()
    .filter((key) => {
      if (mode === 'columns' && columns.includes(key)) return false;
      const title = nebula.metaType(key).title.toLowerCase();
      return !word || key.toLowerCase().includes(word) || title.includes(word);
    })
    .sort((a, b) => nebula.metaType(a).title.localeCompare(nebula.metaType(b).title));

  const fieldList = (
    <>
      <div className="hd">{mode === 'columns' ? 'Add column' : 'Add filter'}</div>
      <div className="fields">
        {word && mode === 'filters' && (
          <button className="it" data-nav onClick={onSearch}>
            <Icon name="search" />
            <span className="grow">Search for “{text.trim()}”</span>
          </button>
        )}
        {fields.map((key) => (
          <button
            key={key}
            className="it"
            data-nav
            onClick={() => {
              if (mode === 'columns') {
                setColumns([...columns, key]);
                onPicked();
              } else {
                setDraft(newDraft(key), null);
              }
            }}
          >
            <Icon name={mode === 'columns' ? 'add' : 'filter_alt'} />
            <span className="grow">{nebula.metaType(key).title}</span>
            <span className="dim">{key}</span>
          </button>
        ))}
      </div>
    </>
  );

  const modeButton = (value: PopoverMode, label: string, count: number) => (
    <button
      className={clsx(mode === value && 'on')}
      onClick={() => {
        setMode(value);
      }}
    >
      {label}
      <span className="count">{count}</span>
    </button>
  );

  return (
    <Pop
      // keep the bar's input focused when clicking rows (not when dragging
      // a column, or typing elsewhere)
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('input, [draggable]')) event.preventDefault();
      }}
    >
      <div className="cols">
        <ViewList tab={tab} view={view} onClose={onClose} />
        <div className="main">
          <div className="modes">
            {modeButton('filters', 'Filters', tab.conditions.length)}
            {modeButton('columns', 'Columns', columns.length)}
          </div>
          {mode === 'filters' ? (
            <>
              <div className="hd">
                Filters
                {tab.conditions.length > 0 && (
                  <button
                    onClick={() => {
                      setConditions([]);
                      setDraft(null);
                    }}
                  >
                    clear all
                  </button>
                )}
              </div>
              {conditionRows.length ? (
                conditionRows
              ) : (
                <div className="it dim">No filters: every asset</div>
              )}
              <div className="divider" />
              {form ?? fieldList}
            </>
          ) : (
            <>
              <div className="hd">Columns, drag to reorder</div>
              <ColumnList columns={columns} onChange={setColumns} />
              <div className="divider" />
              {fieldList}
            </>
          )}
        </div>
      </div>
      <div className="foot">
        <span>↑↓ move</span>
        <span>Enter pick or search</span>
        <span>field:value adds a filter</span>
        <span>⌫ removes the last filter</span>
        <span>Esc close</span>
      </div>
    </Pop>
  );
};

export default FilterPopover;
