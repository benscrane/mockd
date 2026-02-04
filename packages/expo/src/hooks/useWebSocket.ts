import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type {
  RequestLog,
  ClientMessage,
  ServerMessage,
  RequestMessage,
  HistoryMessage,
} from '@mockd/shared';
import { getEndpointWebSocketUrl } from '../api/config';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketOptions {
  subdomain?: string;
  endpointId?: string;
  projectId?: string;
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  requests: RequestLog[];
  connect: () => void;
  disconnect: () => void;
  clearRequests: () => void;
}

const MAX_REQUESTS = 100;
const PING_INTERVAL = 30000;
const MIN_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

function getWebSocketUrl(doName: string): string {
  const baseWsUrl = getEndpointWebSocketUrl();
  return `${baseWsUrl}/m/${doName}`;
}

/**
 * WebSocket hook for real-time request logs.
 * Handles reconnection and app background/foreground transitions.
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { subdomain, endpointId, autoConnect = true } = options;
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [requests, setRequests] = useState<RequestLog[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(MIN_RECONNECT_DELAY);
  const shouldReconnectRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const clearTimers = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const startPingInterval = useCallback(() => {
    pingIntervalRef.current = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, PING_INTERVAL);
  }, [sendMessage]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as ServerMessage;

      switch (message.type) {
        case 'pong':
          break;

        case 'request': {
          const requestMsg = message as RequestMessage;
          setRequests((prev) => {
            const newRequests = [requestMsg.data, ...prev];
            return newRequests.slice(0, MAX_REQUESTS);
          });
          break;
        }

        case 'history': {
          const historyMsg = message as HistoryMessage;
          setRequests((prev) => {
            const combined = [...historyMsg.data, ...prev];
            const seen = new Set<string>();
            const unique = combined.filter((req) => {
              if (seen.has(req.id)) return false;
              seen.add(req.id);
              return true;
            });
            return unique.slice(0, MAX_REQUESTS);
          });
          break;
        }

        case 'error':
          console.error('WebSocket error message:', message.data);
          break;
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }, []);

  const connect = useCallback(() => {
    if (!subdomain) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    clearTimers();
    shouldReconnectRef.current = true;
    setStatus('connecting');

    try {
      const ws = new WebSocket(getWebSocketUrl(subdomain));
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectDelayRef.current = MIN_RECONNECT_DELAY;
        sendMessage({ type: 'getHistory', endpointId });
        sendMessage({ type: 'subscribe', endpointId });
        startPingInterval();
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        clearTimers();
        scheduleReconnect();
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setStatus('error');
      scheduleReconnect();
    }
  }, [clearTimers, endpointId, handleMessage, sendMessage, startPingInterval, subdomain]);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) return;
    // Only reconnect if app is in foreground
    if (appStateRef.current !== 'active') return;

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, reconnectDelayRef.current);

    reconnectDelayRef.current = Math.min(
      reconnectDelayRef.current * 2,
      MAX_RECONNECT_DELAY
    );
  }, [connect]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearTimers();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
  }, [clearTimers]);

  const clearRequests = useCallback(() => {
    setRequests([]);
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground, reconnect
        if (shouldReconnectRef.current && subdomain) {
          connect();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background, disconnect to save battery
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
          clearTimers();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [clearTimers, connect, subdomain]);

  // Auto-connect on mount or when subdomain/endpointId changes
  useEffect(() => {
    if (autoConnect && subdomain) {
      connect();
    }

    return () => disconnect();
  }, [subdomain, endpointId, autoConnect, connect, disconnect]);

  return {
    status,
    requests,
    connect,
    disconnect,
    clearRequests,
  };
}
