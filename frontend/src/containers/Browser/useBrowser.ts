import { useContext } from 'react';

import { BrowserContext, type BrowserContextType } from './context';

export const useBrowser = (): BrowserContextType => {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error('useBrowser must be used within a BrowserProvider');
  }
  return context;
};
