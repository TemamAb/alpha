import { useState, useEffect, useRef, useCallback } from 'react';

// This should match the interface in FoundationDashboard.tsx
interface StreamEvent {
  id: string;
  timestamp: string;
  chain: string;
  eventType: string;
  details: string;
  value: string;
}

type WebSocketStatus = 'Connecting...' | 'Connected' | 'Error' | 'Closed' | 'Reconnecting...';

export const useWebSocket = (url: string) => {
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('Connecting...');
  const [latency, setLatency] = useState<number | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    if (!url) return;

    // Clean up previous connection if it exists
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setWsStatus('Connected');
      retryCountRef.current = 0; // Reset retry count

      // Start pinging on successful connection
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 5000); // Ping every 5 seconds
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        // Handle pong for latency calculation
        if (message.type === 'pong' && message.timestamp) {
          const roundTripTime = Date.now() - message.timestamp;
          setLatency(roundTripTime);
          return; // Don't add pong to stream events
        }

        if (message.id && message.eventType) {
          setStreamEvents(prevEvents => [message, ...prevEvents.slice(0, 49)]); // Prepend and keep last 50
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setWsStatus('Error');
    };

    ws.onclose = () => {
      setWsStatus('Closed');
      setLatency(null); // Reset latency on disconnect

      // Stop pinging
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      
      // Exponential backoff
      const delay = Math.min(1000 * (2 ** retryCountRef.current), 30000);
      console.log(`WebSocket closed. Reconnecting in ${delay}ms...`);
      setWsStatus('Reconnecting...');
      
      retryCountRef.current += 1;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { streamEvents, wsStatus, latency };
};