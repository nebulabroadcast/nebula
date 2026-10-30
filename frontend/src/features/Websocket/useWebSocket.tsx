import { useContext } from 'react';

import { WebSocketContext } from './context';
import type { WebSocketContextType } from './types';

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  return context;
};
