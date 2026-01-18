export type WebSocketMessageData = Record<string, string | number | boolean | object | null>;

export interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (
    topic: string,
    handler: (topic: string, message: WebSocketMessageData) => void
  ) => () => void;
  // Potentially: sendMessage: (message: any) => void;
}

