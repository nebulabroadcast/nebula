import { Button, Navbar } from '@components';
import clsx from 'clsx';
import styled from 'styled-components';

import { useBrowser } from './useBrowser';

const TabBar = styled(Navbar)`
  gap: 2px;
  overflow-x: auto;

  .tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px 0 8px;
    min-height: 28px;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    color: var(--color-text-dim);

    &:hover {
      background-color: var(--color-surface-03);
    }

    &.active {
      background-color: var(--color-surface-04);
      color: var(--color-text-hl);
    }

    .new {
      padding: 0 4px;
      border-radius: 4px;
      font-size: 0.8em;
      background-color: var(--color-violet);
      color: var(--color-text-hl);
    }

    .close {
      font-size: 16px;
      opacity: 0.6;

      &:hover {
        opacity: 1;
      }
    }
  }
`;

const BrowserTabs = () => {
  const browser = useBrowser();

  return (
    <TabBar>
      {browser.tabs.map((tab) => {
        const view = browser.view(tab);
        const detail =
          tab.query ||
          (tab.conditions.length
            ? `${tab.conditions.length} condition${tab.conditions.length > 1 ? 's' : ''}`
            : '');
        const newCount = browser.newCounts[tab.id] ?? 0;
        return (
          <div
            key={tab.id}
            className={clsx('tab', tab.id === browser.activeId && 'active')}
            onClick={() => {
              browser.activateTab(tab.id);
            }}
            onAuxClick={(event) => {
              if (event.button === 1) browser.closeTab(tab.id);
            }}
          >
            <span>
              {view?.name}
              {detail && ` · ${detail}`}
            </span>
            {newCount > 0 && (
              <span
                className="new"
                data-tooltip="Reload to show new assets"
                onClick={(event) => {
                  event.stopPropagation();
                  browser.activateTab(tab.id);
                  browser.reloadTab(tab.id);
                }}
              >
                {newCount} new
              </span>
            )}
            {browser.tabs.length > 1 && (
              <span
                className="close icon material-symbols-outlined"
                translate="no"
                onClick={(event) => {
                  event.stopPropagation();
                  browser.closeTab(tab.id);
                }}
              >
                close
              </span>
            )}
          </div>
        );
      })}
      <Button
        icon="add"
        className="tool"
        tooltip="New tab"
        onClick={() => {
          browser.openTab();
        }}
      />
    </TabBar>
  );
};

export default BrowserTabs;
