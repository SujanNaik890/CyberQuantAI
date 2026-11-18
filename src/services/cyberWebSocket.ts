import { useCyberStore } from '../store/cyberStore';
import { WSMessage } from '../engine/cyberModels';
import { WS_URL } from '../config/api';

let socket: WebSocket | null = null;
let reconnectTimer: any = null;

export function initCyberWebSocket() {
  if (typeof window === 'undefined') return;

  const wsUrl = WS_URL;

  function connect() {
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        useCyberStore.getState().setIsConnected(true);
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          const store = useCyberStore.getState();

          switch (msg.type) {
            case 'new_event':
              store.addEvent(msg.payload);
              break;
            case 'new_alert':
              store.addAlert(msg.payload);
              break;
            case 'new_incident':
              store.addIncident(msg.payload);
              break;
            case 'alert_acknowledged':
              // Alert was acknowledged elsewhere
              useCyberStore.setState((s) => ({
                alerts: s.alerts.map((a) => (a.alertId === msg.payload.alertId ? { ...a, isAcknowledged: true } : a)),
              }));
              break;
            case 'asset_risk_update':
              store.updateAssetRisks(msg.payload);
              break;
            case 'financial_summary':
              store.setFinancialSummary(msg.payload);
              break;
            case 'reset_telemetry':
              store.resetCyberThreats();
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      socket.onclose = () => {
        useCyberStore.getState().setIsConnected(false);
        scheduleReconnect();
      };

      socket.onerror = () => {
        useCyberStore.getState().setIsConnected(false);
      };
    } catch (e) {
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 3000);
    }
  }

  connect();

  return () => {
    if (socket) {
      socket.close();
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
  };
}
