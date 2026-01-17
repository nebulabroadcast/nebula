import { useContext } from 'react';

import { WebSocketContext } from './WebSocketProvider';
import type { WebSocketContextType } from './WebSocketProvider';

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  return context;
};
