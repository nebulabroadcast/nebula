export type WebSocketMessageData = Record<
  string,
  string | number | boolean | object | null
>;

export interface WebSocketContextType {
  isConnected: boolean;
  subscribe: <T = WebSocketMessageData>(
    topic: string,
    handler: (topic: string, message: T) => void
  ) => () => void;
  // Potentially: sendMessage: (message: any) => void;
}
