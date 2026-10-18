import { Button, Dropdown, InputText, Navbar } from '@components';
import type { DropdownOptionProps } from '@components/Dropdown';
import { useDialog } from '@features/Dialogs';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

import {
  conditionLabel,
  filterableKeys,
  parseFilterInput,
  queryWords,
} from './conditions';
import { siteViewKey, userViewKey } from './query';
import type { Condition, TabSettings } from './types';
import { useBrowser } from './useBrowser';

import nebula from '@/nebula';

const MAX_SUGGESTIONS = 8;

const FilterInput = styled.div`
  position: relative;
  flex-grow: 1;
  display: flex;

  input {
    flex-grow: 1;
    min-width: 120px;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    padding: 4px 0;
    background-color: var(--color-surface-04);
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.5);

    button {
      justify-content: flex-start;
      background: none;
      border: 0;
    }
  }
`;

// Conditions with the same key are replaced
const mergeConditions = (current: Condition[], added: Condition[]): Condition[] => [
  ...current.filter((c) => !added.some((a) => a.key === c.key)),
  ...added,
];

const BrowserFilterBar = ({ tab }: { tab: TabSettings }) => {
  const browser = useBrowser();
  const showDialog = useDialog();
  const view = browser.view(tab);
  const [text, setText] = useState(tab.query);
  const [focused, setFocused] = useState(false);

  // Fulltext words apply while typing; `key:value` words become
  // conditions on Enter
  useEffect(() => {
    const query = queryWords(text);
    if (query === tab.query) return;
    const timer = setTimeout(() => {
      browser.updateTab(tab.id, { query });
    }, 300);
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const applyText = () => {
    const { conditions, query } = parseFilterInput(text);
    browser.updateTab(tab.id, {
      conditions: mergeConditions(tab.conditions, conditions),
      query,
    });
    setText(query);
  };

  // Fields matching the word being typed
  const lastWord = text.split(/\s+/).at(-1) ?? '';
  const suggestions =
    focused && lastWord.length >= 2 && !lastWord.includes(':')
      ? filterableKeys()
          .filter((key) => {
            const word = lastWord.toLowerCase();
            const header = nebula.metaType(key).header || '';
            return (
              key.toLowerCase().includes(word) || header.toLowerCase().includes(word)
            );
          })
          .slice(0, MAX_SUGGESTIONS)
      : [];

  const addCondition = (key: string) => {
    setText(text.slice(0, text.length - lastWord.length).trimEnd());
    showDialog('condition', nebula.metaType(key).title || key, { field: key })
      .then((condition) => {
        browser.updateTab(tab.id, {
          conditions: mergeConditions(tab.conditions, [condition]),
        });
      })
      .catch(() => {
        // dialog dismissed, do nothing
      });
  };

  //
  // Views
  //

  const viewOptions: DropdownOptionProps[] = [
    ...(nebula.settings?.views || []).map((v) => ({
      label: v.name,
      separator: v.separator,
      onClick: () => {
        browser.updateTab(tab.id, { view: siteViewKey(v.id) });
      },
    })),
    ...browser.userViews.map((v, idx) => ({
      label: v.name,
      icon: 'person',
      separator: idx === 0,
      onClick: () => {
        browser.updateTab(tab.id, { view: userViewKey(v.id), sort: v.sort });
      },
    })),
    {
      label: 'Save as view...',
      icon: 'bookmark_add',
      separator: true,
      onClick: () => {
        showDialog('prompt', 'Save as view', { placeholder: 'View name' })
          .then((name) => {
            browser.saveUserView(tab.id, name);
          })
          .catch(() => {
            // dialog dismissed, do nothing
          });
      },
    },
  ];

  const [viewKind, userViewId] = tab.view.split(':', 2);
  if (viewKind === 'user') {
    viewOptions.push(
      {
        label: 'Rename view...',
        icon: 'edit',
        onClick: () => {
          showDialog('prompt', 'Rename view', { value: view?.name })
            .then((name) => {
              browser.renameUserView(userViewId, name);
            })
            .catch(() => {
              // dialog dismissed, do nothing
            });
        },
      },
      {
        label: 'Delete view',
        icon: 'delete',
        hlColor: 'var(--color-red)',
        onClick: () => {
          showDialog('confirm', 'Delete view', {
            message: `Delete the view **${view?.name}**?`,
          })
            .then(() => {
              browser.deleteUserView(userViewId);
            })
            .catch(() => {
              // dialog dismissed, do nothing
            });
        },
      }
    );
  }

  return (
    <Navbar>
      <Dropdown
        options={viewOptions}
        label={view?.name || ''}
        buttonStyle={{ justifyContent: 'flex-start' }}
        iconOnRight={true}
      />
      {tab.conditions.map((condition, idx) => (
        <Button
          key={idx}
          label={conditionLabel(condition)}
          icon="filter_alt_off"
          iconOnRight={true}
          className="tool"
          tooltip="Remove condition"
          onClick={() => {
            browser.updateTab(tab.id, {
              conditions: tab.conditions.filter((_, i) => i !== idx),
            });
          }}
        />
      ))}
      <FilterInput>
        <InputText
          placeholder="Search, or type a field name to filter by it"
          value={text}
          onChange={setText}
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyText();
          }}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
          }}
        />
        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((key) => (
              <Button
                key={key}
                label={`${nebula.metaType(key).title} (${key})`}
                icon="filter_alt"
                // keep the input focused until the click
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  addCondition(key);
                }}
              />
            ))}
          </div>
        )}
      </FilterInput>
      <Button
        icon="close"
        className="tool"
        tooltip="Clear search query"
        onClick={() => {
          setText('');
        }}
      />
      <Button
        icon="refresh"
        className="tool"
        tooltip="Reload"
        onClick={() => {
          browser.reloadTab(tab.id);
        }}
      />
    </Navbar>
  );
};

export default BrowserFilterBar;
