import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

export enum MessageType {
  SYSTEM = 'SYSTEM',
  PROFIT_DROP = 'PROFIT_DROP',
  CONFIRMATION = 'CONFIRMATION',
  WITHDRAWAL = 'WITHDRAWAL',
  TELEMETRY = 'TELEMETRY',
  ALERT = 'ALERT'
}

export interface WebSocketMessage {
  type: MessageType;
  timestamp: string;
  payload: any;
}

export class AlphaOrionWebSocketServer {
  private wss: WebSocketServer;

  constructor(server: Server) {
    // Initialize WebSocket server on the same HTTP server
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WS] Client connected to Alpha-Orion Stream');
      
      // Send initial handshake/welcome message
      this.send(ws, {
        type: MessageType.SYSTEM,
        timestamp: new Date().toISOString(),
        payload: { 
          message: 'Connected to Alpha-Orion Institutional Feed',
          status: 'OPERATIONAL' 
        }
      });

      ws.on('error', (err) => console.error('[WS] Error:', err));
    });
  }

  public broadcast(message: WebSocketMessage) {
    const data = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private send(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}