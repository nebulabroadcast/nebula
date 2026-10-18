import BrowserFilterBar from './BrowserFilterBar';
import BrowserTab from './BrowserTab';
import BrowserTabs from './BrowserTabs';
import { useBrowser } from './useBrowser';

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
      <BrowserTabs />
      {/* Starts over with another tab or view (the input shows the tab's query) */}
      {active && <BrowserFilterBar key={`${active.id}:${active.view}`} tab={active} />}
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
