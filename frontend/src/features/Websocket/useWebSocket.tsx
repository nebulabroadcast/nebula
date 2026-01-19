import { useContext } from 'react';

import type { WebSocketContextType } from './types';
import { WebSocketContext } from './WebSocketProvider';

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  return context;
};
