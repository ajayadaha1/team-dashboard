import { useEffect, useRef } from 'react';
import { useUserStore } from './store';

type WsMessage = {
  type: string;
  [key: string]: unknown;
};

type MessageHandler = (msg: WsMessage) => void;

// ---------- Singleton shared WebSocket connection ----------
let sharedWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
const handlers = new Set<MessageHandler>();

function ensureConnection() {
  if (sharedWs && (sharedWs.readyState === WebSocket.OPEN || sharedWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const userName = useUserStore.getState().currentUser;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const encoded = encodeURIComponent(userName || '');
  const wsUrl = `${proto}://${window.location.host}/team-dashboard-api/ws?user_name=${encoded}`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[WS] connected');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WsMessage;
      handlers.forEach((h) => h(msg));
    } catch {
      // ignore non-JSON
    }
  };

  ws.onclose = () => {
    console.log('[WS] disconnected, reconnecting in 3s…');
    sharedWs = null;
    if (handlers.size > 0) {
      reconnectTimer = setTimeout(ensureConnection, 3000);
    }
  };

  ws.onerror = () => {
    ws.close();
  };

  sharedWs = ws;
}

/**
 * Hook that subscribes a handler to the shared WebSocket connection.
 * Multiple components can call this — only one connection is opened.
 */
export function useWebSocket(onMessage: MessageHandler) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const wrapper: MessageHandler = (msg) => handlerRef.current(msg);
    handlers.add(wrapper);
    ensureConnection();

    return () => {
      handlers.delete(wrapper);
      // Close the connection when the last subscriber unmounts
      if (handlers.size === 0) {
        clearTimeout(reconnectTimer);
        sharedWs?.close();
        sharedWs = null;
      }
    };
  }, []);
}
