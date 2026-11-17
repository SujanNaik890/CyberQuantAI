import { create } from 'zustand';
import { 
  CyberEvent, 
  RiskAlert, 
  FinancialIncident, 
  AssetRiskStatus, 
  CyberNotification, 
  FinancialSummary 
} from '../engine/cyberModels';

export interface CyberStore {
  events: CyberEvent[];
  alerts: RiskAlert[];
  incidents: FinancialIncident[];
  assetRiskMap: Record<string, AssetRiskStatus>;
  notifications: CyberNotification[];
  financialSummary: FinancialSummary;
  activeNavTab: 'grid' | 'detection' | 'alerts' | 'financial' | 'analytics' | 'ai';
  selectedIncident: FinancialIncident | null;
  selectedAlert: RiskAlert | null;
  isMuted: boolean;
  isConnected: boolean;

  // Actions
  setNavTab: (tab: 'grid' | 'detection' | 'alerts' | 'financial' | 'analytics' | 'ai') => void;
  selectIncident: (incident: FinancialIncident | null) => void;
  selectAlert: (alert: RiskAlert | null) => void;
  toggleMute: () => void;
  setIsConnected: (connected: boolean) => void;
  addEvent: (event: CyberEvent) => void;
  addAlert: (alert: RiskAlert) => void;
  addIncident: (incident: FinancialIncident) => void;
  updateAssetRisks: (risks: AssetRiskStatus[]) => void;
  setFinancialSummary: (summary: FinancialSummary) => void;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  fetchInitialData: () => Promise<void>;
  triggerTestAttack: (scenario: string) => Promise<void>;
}

export const useCyberStore = create<CyberStore>((set, get) => ({
  events: [],
  alerts: [],
  incidents: [],
  assetRiskMap: {},
  notifications: [],
  financialSummary: {
    totalFinancialExposure: 0,
    currentIncidentLoss: 0,
    totalReplacementCost: 0,
    totalRecoveryCost: 0,
    totalOperationalCost: 0,
    totalUnservedImpact: 0,
    incidentCount: 0,
    assetExposure: [],
    incidentExposure: [],
  },
  activeNavTab: 'grid',
  selectedIncident: null,
  selectedAlert: null,
  isMuted: false,
  isConnected: false,

  setNavTab: (tab) => set({ activeNavTab: tab }),
  selectIncident: (incident) => set({ selectedIncident: incident }),
  selectAlert: (alert) => set({ selectedAlert: alert }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setIsConnected: (connected) => set({ isConnected: connected }),

  addEvent: (event) => {
    set((s) => ({
      events: [event, ...s.events.filter((e) => e.eventId !== event.eventId)].slice(0, 100),
    }));
  },

  addAlert: (alert) => {
    const notif: CyberNotification = {
      id: `notif-${alert.alertId}`,
      timestamp: alert.timestamp,
      severity: alert.severity,
      title: `${alert.severity.toUpperCase()}: ${alert.attackType.replace(/_/g, ' ').toUpperCase()}`,
      message: `${alert.targetAssetName} under threat. Risk score: ${alert.riskScore}/100.`,
      assetId: alert.targetAssetId,
      alertId: alert.alertId,
      isRead: false,
    };

    set((s) => ({
      alerts: [alert, ...s.alerts.filter((a) => a.alertId !== alert.alertId)].slice(0, 100),
      notifications: [notif, ...s.notifications].slice(0, 50),
    }));

    // Optional audio tone if not muted
    if (!get().isMuted) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = alert.riskScore >= 75 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(alert.riskScore >= 75 ? 880 : 520, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {
        // audio context restriction safe ignore
      }
    }
  },

  addIncident: (incident) => {
    set((s) => {
      const updated = [incident, ...s.incidents.filter((i) => i.incidentId !== incident.incidentId)].slice(0, 100);
      
      // Recompute local financial summary
      let totalFinancialExposure = 0;
      let totalReplacementCost = 0;
      let totalRecoveryCost = 0;
      let totalOperationalCost = 0;
      let totalUnservedImpact = 0;
      const assetMap: Record<string, { assetId: string; assetName: string; exposure: number }> = {};
      const incidentExposure: { incidentId: string; loss: number; attackType: any }[] = [];

      for (const inc of updated) {
        totalFinancialExposure += inc.totalEstimatedLoss;
        totalReplacementCost += inc.replacementElectricityCost;
        totalRecoveryCost += inc.recoveryExpenses;
        totalOperationalCost += inc.operationalExpenses;
        totalUnservedImpact += inc.unservedElectricityImpact;

        if (!assetMap[inc.targetAssetId]) {
          assetMap[inc.targetAssetId] = { assetId: inc.targetAssetId, assetName: inc.targetAssetName, exposure: 0 };
        }
        assetMap[inc.targetAssetId].exposure += inc.totalEstimatedLoss;
        incidentExposure.push({ incidentId: inc.incidentId, loss: inc.totalEstimatedLoss, attackType: inc.attackCategory });
      }

      return {
        incidents: updated,
        financialSummary: {
          totalFinancialExposure,
          currentIncidentLoss: incident.totalEstimatedLoss,
          totalReplacementCost,
          totalRecoveryCost,
          totalOperationalCost,
          totalUnservedImpact,
          incidentCount: updated.length,
          assetExposure: Object.values(assetMap),
          incidentExposure,
        },
      };
    });
  },

  updateAssetRisks: (risks) => {
    const map: Record<string, AssetRiskStatus> = {};
    risks.forEach((r) => { map[r.assetId] = r; });
    set({ assetRiskMap: map });
  },

  setFinancialSummary: (summary) => set({ financialSummary: summary }),

  acknowledgeAlert: async (alertId) => {
    try {
      const backendUrl = `http://${window.location.hostname || 'localhost'}:3001/api/alerts/${alertId}/acknowledge`;
      await fetch(backendUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy: 'GridAtlas-Operator' }),
      });

      set((s) => ({
        alerts: s.alerts.map((a) => (a.alertId === alertId ? { ...a, isAcknowledged: true } : a)),
      }));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  },

  markNotificationRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
  },

  clearAllNotifications: () => set({ notifications: [] }),

  fetchInitialData: async () => {
    const host = window.location.hostname || 'localhost';
    try {
      const [eventsRes, alertsRes, incsRes, risksRes, sumRes] = await Promise.all([
        fetch(`http://${host}:3001/api/events`).catch(() => null),
        fetch(`http://${host}:3001/api/alerts`).catch(() => null),
        fetch(`http://${host}:3001/api/financial/incidents`).catch(() => null),
        fetch(`http://${host}:3001/api/assets/risk`).catch(() => null),
        fetch(`http://${host}:3001/api/financial/summary`).catch(() => null),
      ]);

      if (eventsRes?.ok) {
        const events = await eventsRes.json();
        set({ events });
      }
      if (alertsRes?.ok) {
        const alerts = await alertsRes.json();
        set({ alerts });
      }
      if (incsRes?.ok) {
        const incidents = await incsRes.json();
        set({ incidents });
      }
      if (risksRes?.ok) {
        const risks = await risksRes.json();
        const map: Record<string, AssetRiskStatus> = {};
        risks.forEach((r: any) => { map[r.assetId] = r; });
        set({ assetRiskMap: map });
      }
      if (sumRes?.ok) {
        const financialSummary = await sumRes.json();
        set({ financialSummary });
      }
    } catch (err) {
      console.warn('Initial data pull failed (backend may be warming up):', err);
    }
  },

  triggerTestAttack: async (scenario) => {
    const host = window.location.hostname || 'localhost';
    const SCENARIOS: Record<string, any> = {
      'kaiga-scada': {
        sourceIP: '198.51.100.42',
        attackCategory: 'unauthorized_scada_access',
        targetAssetId: 'GEN-NUC-KAIGA',
        description: 'Unauthorized remote modification of Primary PHWR coolant flow setpoint via compromised maintenance VPN portal.',
        confidenceLevel: 0.95,
      },
      'sharavathi-trip': {
        sourceIP: '203.0.113.88',
        attackCategory: 'abnormal_generator_shutdown',
        targetAssetId: 'GEN-HYD-SHARAVATHI',
        description: 'Malicious Modbus command 0x05 forced penstock gate trip and shut down turbine unit 2.',
        confidenceLevel: 0.92,
      },
      'nelamangala-switch': {
        sourceIP: '185.220.101.5',
        attackCategory: 'suspicious_substation_switching',
        targetAssetId: 'SUB-NELAMANGALA-400',
        description: 'IEC 61850 GOOSE packet injection spoofing busbar overcurrent protection to trigger 400kV breaker lockouts.',
        confidenceLevel: 0.88,
      },
      'pavagada-inverter': {
        sourceIP: '194.26.29.112',
        attackCategory: 'repeated_auth_failure',
        targetAssetId: 'GEN-SOL-PAVAGADA',
        description: 'High-volume dictionary attack targeted inverter RTU web interfaces across sector B.',
        confidenceLevel: 0.74,
      },
      'agc-manipulation': {
        sourceIP: '91.240.118.17',
        attackCategory: 'unauthorized_agc_modification',
        targetAssetId: 'SUB-DEVANAHALLI-400',
        description: 'Tampered AGC governor control packets injected into EMS dispatch ring causing generation throttle.',
        confidenceLevel: 0.89,
      },
      'peenya-blackout': {
        sourceIP: '45.154.255.89',
        attackCategory: 'transmission_line_trip',
        targetAssetId: 'LOAD-BLR-PEENYA',
        description: 'Compromised distribution SCADA unit sent trip signals to feeder lines feeding industrial estates.',
        confidenceLevel: 0.83,
      },
    };

    const payload = SCENARIOS[scenario] || SCENARIOS['kaiga-scada'];
    try {
      await fetch(`http://${host}:3001/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          detectionSource: 'simulated_attack',
          attackStatus: 'confirmed',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to trigger attack event:', err);
    }
  },
}));
