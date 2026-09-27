import { createContext } from 'react';

import type { WebSocketContextType } from './types';

export const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);
