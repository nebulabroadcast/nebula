import { useDialog } from '@features/Dialogs';
import clsx from 'clsx';
import React, { useState } from 'react';
import styled from 'styled-components';

import {
  conditionOf,
  lastWord,
  conditionParts,
  assetKeys,
  newDraft,
  operatorsFor,
  withOperator,
  draftOf,
  type Draft,
} from './conditions';
import { siteViewKey, tabColumns, userViewKey } from './query';
import type { TabSettings } from './types';
import { useBrowser } from './useBrowser';
import ValueInput from './ValueInput';

import nebula from '@/nebula';

const Pop = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  max-height: 480px;
  background-color: var(--color-surface-03);
  border: 1px solid var(--color-surface-06);
  border-radius: 6px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
  overflow: hidden;

  .cols {
    display: grid;
    grid-template-columns: 168px 1fr;
    min-height: 0;
    flex: 1;

    > div {
      min-height: 0;
      overflow: auto;
      padding-bottom: 6px;
    }
  }

  .views {
    border-right: 1px solid var(--color-surface-05);
  }

  .hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 4px;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-text-dim);

    button {
      border: 0;
      background: none;
      padding: 0;
      cursor: pointer;
      color: var(--color-text-dim);
      font-size: 10.5px;
      text-transform: none;
      letter-spacing: 0;

      &:hover {
        color: var(--color-text-hl);
      }
    }
  }

  .it {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 26px;
    padding: 0 10px;
    border: 0;
    background: none;
    color: var(--color-text);
    text-align: left;
    white-space: nowrap;
    cursor: pointer;

    .icon {
      font-size: 17px;
      color: var(--color-text-dim);
    }

    .grow {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dim {
      color: var(--color-text-dim);
    }

    .actions {
      display: none;
      gap: 2px;
    }

    &:hover .actions {
      display: flex;
    }

    &:hover,
    &.hi {
      background-color: var(--color-surface-05);
      color: var(--color-text-hl);
    }

    &.hi {
      box-shadow: inset 2px 0 0 var(--color-violet);
    }

    &.current,
    &.current .icon {
      color: var(--color-cyan);
    }

    &.armed {
      box-shadow: inset 2px 0 0 var(--color-red);
      background-color: color-mix(in srgb, var(--color-red) 10%, transparent);
    }

    input {
      flex: 1;
      height: 22px;
    }
  }

  .remove {
    font-size: 15px;
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }

  .fields {
    max-height: 160px;
    overflow: auto;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 10px 10px;

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }

    .row.end {
      justify-content: flex-end;
    }
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 120px;
    overflow: auto;
  }

  .options button,
  .chips button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 0 8px;
    border: 0;
    border-radius: 3px;
    background-color: var(--color-surface-04);
    color: var(--color-text-dim);
    cursor: pointer;

    &:hover {
      color: var(--color-text-hl);
    }

    &.on {
      background-color: var(--color-surface-06);
      color: var(--color-text-hl);
    }

    .icon {
      font-size: 14px;
    }
  }

  .options button.on {
    background-color: var(--color-violet);
  }

  .operators {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 2px;
    border-radius: 4px;
    background-color: var(--color-surface-04);

    button {
      height: 22px;
      padding: 0 8px;
      border: 0;
      border-radius: 3px;
      background: none;
      color: var(--color-text-dim);
      cursor: pointer;

      &.on {
        background-color: var(--color-surface-07);
        color: var(--color-cyan);
      }
    }
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 2px 10px 6px;
  }

  .divider {
    border-top: 1px solid var(--color-surface-05);
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 4px 10px;
    border-top: 1px solid var(--color-surface-05);
    font-size: 10.5px;
    color: var(--color-text-dim);
  }

  @media (max-width: 520px) {
    .cols {
      grid-template-columns: 1fr;
    }

    .views {
      max-height: 120px;
      border-right: 0;
      border-bottom: 1px solid var(--color-surface-05);
    }
  }
`;

const Icon = ({ name, className }: { name: string; className?: string }) => (
  <span className={clsx('icon material-symbols-outlined', className)} translate="no">
    {name}
  </span>
);

interface FilterPopoverProps {
  tab: TabSettings;
  // Typed in the bar: narrows the fields, or is the search
  text: string;
  draft: Draft | null;
  editIndex: number | null;
  armed: boolean;
  // Picking a field adds a column instead of a condition
  pickColumn: boolean;
  setDraft: (draft: Draft | null, editIndex?: number | null) => void;
  setPickColumn: (on: boolean) => void;
  onSearch: () => void;
  onClose: () => void;
}

// Everything about what the tab shows: its view, its conditions and its
// columns. Rows with data-nav can be walked with the arrow keys from the
// bar (BrowserFilterBar): the filters and fields first, then the views
const FilterPopover = ({
  tab,
  text,
  draft,
  editIndex,
  armed,
  pickColumn,
  setDraft,
  setPickColumn,
  onSearch,
  onClose,
}: FilterPopoverProps) => {
  const browser = useBrowser();
  const showDialog = useDialog();
  const view = browser.view(tab);
  const [saving, setSaving] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  if (!view) return null;
  const columns = tabColumns(view, tab);

  const setConditions = (conditions: TabSettings['conditions']) => {
    browser.updateTab(tab.id, { conditions });
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

  const setColumns = (names: string[]) => {
    browser.updateTab(tab.id, { columns: names });
  };

  //
  // Views
  //

  const nameInput = (
    value: string,
    onChange: (value: string) => void,
    onDone: (value: string | null) => void
  ) => (
    <div className="it">
      <input
        className="nb-input"
        autoFocus
        value={value}
        placeholder="View name"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') onDone(value.trim() || null);
          if (event.key === 'Escape') onDone(null);
        }}
      />
    </div>
  );

  const views = (
    <div className="views">
      <div className="hd">Views</div>
      {(nebula.settings?.views || []).map((v) => {
        const key = siteViewKey(v.id);
        return (
          <React.Fragment key={key}>
            {v.separator && <div className="divider" />}
            <button
              className={clsx('it', tab.view === key && 'current')}
              data-nav
              onClick={() => {
                browser.selectView(tab.id, key);
                onClose();
              }}
            >
              <Icon name={tab.view === key ? 'radio_button_checked' : 'folder_open'} />
              <span className="grow">{v.name}</span>
            </button>
          </React.Fragment>
        );
      })}
      <div className="hd">My views</div>
      {browser.userViews.map((v) => {
        const key = userViewKey(v.id);
        if (renaming?.id === v.id) {
          return (
            <React.Fragment key={key}>
              {nameInput(
                renaming.name,
                (name) => {
                  setRenaming({ id: v.id, name });
                },
                (name) => {
                  if (name) browser.renameUserView(v.id, name);
                  setRenaming(null);
                }
              )}
            </React.Fragment>
          );
        }
        return (
          <button
            key={key}
            className={clsx('it', tab.view === key && 'current')}
            data-nav
            onClick={() => {
              browser.selectView(tab.id, key);
              onClose();
            }}
          >
            <Icon name="person" />
            <span className="grow">{v.name}</span>
            <span className="actions">
              <span
                title="Rename"
                onClick={(event) => {
                  event.stopPropagation();
                  setRenaming({ id: v.id, name: v.name });
                }}
              >
                <Icon name="edit" className="remove" />
              </span>
              <span
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  showDialog('confirm', 'Delete view', {
                    message: `Delete the view **${v.name}**?`,
                  })
                    .then(() => {
                      browser.deleteUserView(v.id);
                    })
                    .catch(() => {
                      // dialog dismissed, do nothing
                    });
                }}
              >
                <Icon name="delete" className="remove" />
              </span>
            </span>
          </button>
        );
      })}
      {saving === null ? (
        <button
          className="it"
          data-nav
          onClick={() => {
            setSaving('');
          }}
        >
          <Icon name="bookmark_add" />
          <span className="grow">Save as view...</span>
        </button>
      ) : (
        nameInput(saving, setSaving, (name) => {
          if (name) browser.saveUserView(tab.id, name);
          setSaving(null);
        })
      )}
    </div>
  );

  //
  // Conditions
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

  // Fields matching the word being typed, to filter by or to show as a
  // column
  const word = lastWord(text).toLowerCase();
  const fields = assetKeys()
    .filter((key) => {
      if (pickColumn && columns.includes(key)) return false;
      const title = nebula.metaType(key).title.toLowerCase();
      return !word || key.toLowerCase().includes(word) || title.includes(word);
    })
    .sort((a, b) => nebula.metaType(a).title.localeCompare(nebula.metaType(b).title));

  const fieldList = (
    <>
      <div className="hd">
        {pickColumn ? 'Add column' : 'Add filter'}
        {pickColumn && (
          <button
            onClick={() => {
              setPickColumn(false);
            }}
          >
            cancel
          </button>
        )}
      </div>
      <div className="fields">
        {word && !pickColumn && (
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
              if (pickColumn) {
                setColumns([...columns, key]);
                setPickColumn(false);
              } else {
                setDraft(newDraft(key), null);
              }
            }}
          >
            <Icon name={pickColumn ? 'view_column' : 'filter_alt'} />
            <span className="grow">{nebula.metaType(key).title}</span>
            <span className="dim">{key}</span>
          </button>
        ))}
      </div>
    </>
  );

  //
  // Columns: the tab's, then the view's that it doesn't show
  //

  const columnChips = (
    <>
      <div className="hd">Columns</div>
      <div className="chips">
        {columns.map((name) => (
          <button
            key={name}
            className="on"
            title={columns.length > 1 ? 'Hide' : undefined}
            onClick={() => {
              if (columns.length > 1) setColumns(columns.filter((c) => c !== name));
            }}
          >
            <Icon name="check" />
            {nebula.metaType(name).header || name}
          </button>
        ))}
        {view.columns
          .filter((name) => !columns.includes(name))
          .map((name) => (
            <button
              key={name}
              title="Show"
              onClick={() => {
                setColumns([...columns, name]);
              }}
            >
              <Icon name="add" />
              {nebula.metaType(name).header || name}
            </button>
          ))}
        <button
          title="Add a column"
          onClick={() => {
            setDraft(null);
            setPickColumn(true);
          }}
        >
          <Icon name="add" />
          ...
        </button>
      </div>
    </>
  );

  return (
    <Pop
      // keep the bar's input focused when clicking rows
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
      }}
    >
      <div className="cols">
        {views}
        <div className="main">
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
          <div className="divider" />
          {columnChips}
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
