import { WebSocketServer, WebSocket } from 'ws';
import { WSMessage } from '../src/engine/cyberModels';

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: any): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    // Send greeting
    const welcomeMsg: WSMessage = {
      type: 'connection_established',
      payload: { serverTime: new Date().toISOString() },
    };
    ws.send(JSON.stringify(welcomeMsg));

    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message.toString());
        // Handle incoming client heartbeat or registration if needed
      } catch (err) {
        // silent ignore
      }
    });

    ws.on('error', () => {});
  });

  return wss;
}

export function broadcastWSMessage(msg: WSMessage): void {
  if (!wss) return;
  const payload = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        // ignore client error
      }
    }
  });
}
