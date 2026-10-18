import { Button } from '@components';
import clsx from 'clsx';

import { useBrowser } from './useBrowser';

// Folder tabs: the active one joins the filter bar below it
const BrowserTabs = () => {
  const browser = useBrowser();

  return (
    <div className="tabs">
      {browser.tabs.map((tab) => {
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
            <span className="label">
              {browser.view(tab)?.name}
              {tab.query && <span className="query"> · {tab.query}</span>}
            </span>
            {newCount > 0 && (
              <span
                className="new"
                title="Reload to show new assets"
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
                title="Close (middle click)"
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
    </div>
  );
};

export default BrowserTabs;
