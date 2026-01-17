import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';

type WebSocketMessageData = Record<string, string | number | boolean | object | null>;

export interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (
    topic: string,
    handler: (topic: string, message: WebSocketMessageData) => void
  ) => () => void;
  // Potentially: sendMessage: (message: any) => void;
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  // subscriptions map: topic -> set of handler functions
  // Using a ref to store subscriptions prevents unnecessary
  // re-renders when a component subscribes

  const subscriptions = useRef<
    Map<string, Set<(topic: string, data: WebSocketMessageData) => void>>
  >(new Map());

  const requestSubscriptions = () => {
    const topics = Array.from(subscriptions.current.keys());
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log('Requesting subscriptions for topics:', topics);
      const subscribeMessage = {
        topic: 'auth',
        token: JSON.parse(localStorage.getItem('accessToken') || '""'),
        subscribe: topics,
      };
      ws.current.send(JSON.stringify(subscribeMessage));
    }
  };

  //
  // Function to establish the connection
  //

  const connect = useCallback(() => {
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const socket = new WebSocket(url);
    socket.onopen = () => {
      console.log('WebSocket Connected');
      requestSubscriptions();
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { topic } = message; // Assuming all messages have a 'topic' field

        if (topic && subscriptions.current.has(topic)) {
          // Iterate over all handlers subscribed to this topic
          subscriptions.current.get(topic)?.forEach((handler) => {
            handler(topic, message.data); // Pass the entire message payload
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
      setTimeout(connect, 2000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      socket.close();
    };

    ws.current = socket;
  }, [url]);

  //
  // Effect to initiate WebSocket connection on mount
  // and clean up on unmount
  //

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  //
  // Function for components to subscribe to a topic
  //

  const subscribe = useCallback(
    (
      topic: string,
      handler: (topic: string, data: WebSocketMessageData) => void
    ): (() => void) => {
      console.log(`Subscribing component to topic: ${topic}`);
      // Get or create the set of handlers for this topic
      if (!subscriptions.current.has(topic)) {
        subscriptions.current.set(topic, new Set());
      }
      subscriptions.current.get(topic)!.add(handler);

      // Send the subscription message to the server

      requestSubscriptions();

      // Return an unsubscribe function
      return () => {
        console.log(`Unsubscribing component from topic: ${topic}`);
        const handlers = subscriptions.current.get(topic);
        if (handlers) {
          handlers.delete(handler);
          // Clean up the topic entry if no handlers are left
          if (handlers.size === 0) {
            subscriptions.current.delete(topic);
            // let the server know we no longer want this topic
            requestSubscriptions();
          }
        }
      };
    },
    []
  );

  const contextValue: WebSocketContextType = {
    isConnected,
    subscribe,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
