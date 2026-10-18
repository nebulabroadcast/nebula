import styled from 'styled-components';

import BrowserFilterBar from './BrowserFilterBar';
import BrowserTab from './BrowserTab';
import BrowserTabs from './BrowserTabs';
import { useBrowser } from './useBrowser';

// Tabs and the filter bar, as high as two navbars and the gap between
// them, so the browser lines up with the panels next to it
const Header = styled.div`
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  height: calc(2 * (var(--input-height) + 8px) + var(--section-gap));
  border-radius: var(--nav-border-radius);
  background-color: var(--color-surface-02);

  .icon {
    font-size: 18px;
  }

  /* Tabs shrink to fit; the new tab button stays at the far right */
  .tabs {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 0;
    padding: 4px 4px 0;
  }

  .tab-list {
    flex: 1;
    align-self: stretch;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    min-width: 0;
    overflow: hidden;
  }

  .tab {
    flex: 0 1 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 48px;
    max-width: 200px;
    height: 30px;
    padding: 0 4px 0 10px;
    border-radius: 6px 6px 0 0;
    color: var(--color-text-dim);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .query {
      color: var(--color-text-dim);
    }

    &:hover {
      background-color: var(--color-surface-03);
      color: var(--color-text);
    }

    &.active {
      background-color: var(--color-surface-04);
      color: var(--color-text-hl);
    }

    .new {
      display: inline-flex;
      align-items: center;
      height: 16px;
      padding: 0 5px;
      border: 1px solid color-mix(in srgb, var(--color-cyan) 50%, transparent);
      border-radius: 8px;
      font-size: 10px;
      color: var(--color-cyan);

      &:hover {
        background-color: color-mix(in srgb, var(--color-cyan) 18%, transparent);
      }
    }

    .close {
      font-size: 15px;
      border-radius: 3px;
      opacity: 0;

      &:hover {
        opacity: 1;
        background-color: var(--color-surface-07);
      }
    }

    &:hover .close,
    &.active .close {
      opacity: 0.7;
    }
  }

  /* the active tab sits on the bar: no rounded corner under the first one */
  .filter-row {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    height: calc(var(--input-height) + 8px);
    margin: 0 4px 4px;
    padding: 4px;
    border-radius: 6px;
    background-color: var(--color-surface-04);
  }

  &:has(.tab:first-child.active) .filter-row {
    border-top-left-radius: 0;
  }

  .filter-bar {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    height: var(--input-height);
    padding: 0 2px 0 8px;
    border-radius: 4px;
    color: var(--color-text-dim);
    cursor: text;

    &.open {
      background-color: var(--color-surface-05);
      outline: 1px solid var(--color-violet);
    }

    &:hover:not(.open) {
      background-color: var(--color-surface-05);
    }

    input {
      flex: 1;
      min-width: 60px;
      height: 100%;
      padding: 0;
      border: 0;
      outline: 0;
      background: none;
      color: var(--color-text);
    }
  }
`;

interface BrowserProps {
  isDragging: boolean;
}

// Every tab stays mounted (hidden ones with display: none), so switching
// tabs keeps their rows and scroll position, and hidden tabs keep up with
// changes
const Browser = ({ isDragging }: BrowserProps) => {
  const browser = useBrowser();
  const active = browser.tabs.find((tab) => tab.id === browser.activeId);

  return (
    <>
      <Header>
        <BrowserTabs />
        {/* Starts over with another tab or view (the input shows the tab's query) */}
        {active && (
          <BrowserFilterBar key={`${active.id}:${active.view}`} tab={active} />
        )}
      </Header>
      {browser.tabs.map((tab) => {
        const view = browser.view(tab);
        return (
          view && (
            <BrowserTab
              key={tab.id}
              tab={tab}
              view={view}
              active={tab.id === browser.activeId}
              isDragging={isDragging}
            />
          )
        );
      })}
    </>
  );
};

export default Browser;
