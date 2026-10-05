import { createContext } from 'react';

import type { ShowDialog } from './registry';

export interface DialogContextType {
  execute: ShowDialog;
}

export const DialogContext = createContext<DialogContextType | undefined>(undefined);
