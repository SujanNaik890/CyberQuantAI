import { create } from 'zustand';
import { Generator, Substation, LoadCenter, TransmissionLine, GridTelemetry, GridEventLog } from '../engine/gridModel';
import { getInitialScenario } from '../engine/presets';
import { stepSimulation } from '../engine/powerflow';

export interface GridStore {
  generators: Generator[];
  substations: Substation[];
  loads: LoadCenter[];
  lines: TransmissionLine[];
  telemetry: GridTelemetry;
  selectedAsset: {
    type: 'generator' | 'substation' | 'load' | 'line';
    id: string;
  } | null;
  eventLogs: GridEventLog[];
  frequencyHistory: number[]; // For real-time oscilloscope
  isPaused: boolean;

  // Actions
  tick: (dt: number) => void;
  selectAsset: (asset: { type: 'generator' | 'substation' | 'load' | 'line'; id: string } | null) => void;
  toggleLineTrip: (lineId: string) => void;
  toggleGenStatus: (genId: string) => void;
  setGenTargetMW: (genId: string, targetMW: number) => void;
  toggleLoadShed: (loadId: string) => void;
  setBaseDemandScale: (scale: number) => void;
  toggleAGC: () => void;
  setNominalFreq: (nominal: 50.00 | 60.00) => void;
  triggerMasterContingency: () => void;
  resetGrid: () => void;
  togglePause: () => void;
  addLog: (log: Omit<GridEventLog, 'id' | 'timestamp'>) => void;
  exportGridStateJSON: () => string;
}

const initialPreset = getInitialScenario();

export const useGridStore = create<GridStore>((set, get) => ({
  generators: initialPreset.generators,
  substations: initialPreset.substations,
  loads: initialPreset.loads,
  lines: initialPreset.lines,
  telemetry: {
    frequencyHz: 50.00,
    totalGenMW: 1980,
    totalDemandMW: 1780,
    netLossesMW: 18.5,
    frequencyDeltaHz: 0.00,
    nominalFreqHz: 50.00,
    agcActive: true,
    baseDemandScale: 1.0,
    simulationSpeed: 1.0,
    scadaDispatched: true,
  },
  selectedAsset: { type: 'generator', id: 'GEN-NUC-01' },
  eventLogs: [
    {
      id: 'log-init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'GridAtlas Synoptic Engine v2.4 initialized. Topology synchronized across 4 buses & 11 corridors.',
    },
    {
      id: 'log-init-2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'agc',
      message: 'Automatic Generation Control (AGC) active: Area Control Error (ACE) targeting nominal 50.00 Hz.',
    },
  ],
  frequencyHistory: Array(100).fill(50.00),
  isPaused: false,

  tick: (dt: number) => {
    const state = get();
    if (state.isPaused) return;

    const result = stepSimulation(
      state.generators,
      state.substations,
      state.loads,
      state.lines,
      state.telemetry,
      dt * state.telemetry.simulationSpeed,
      (log) => {
        set((s) => ({
          eventLogs: [log, ...s.eventLogs].slice(0, 80),
        }));
      }
    );

    // Keep rolling history of frequency for waveform display (100 samples)
    const newHistory = [...state.frequencyHistory.slice(1), result.telemetry.frequencyHz];

    set({
      generators: result.generators,
      substations: result.substations,
      loads: result.loads,
      lines: result.lines,
      telemetry: result.telemetry,
      frequencyHistory: newHistory,
    });
  },

  selectAsset: (asset) => set({ selectedAsset: asset }),

  toggleLineTrip: (lineId: string) => {
    set((state) => {
      const line = state.lines.find((l) => l.id === lineId);
      if (!line) return state;
      const nextStatus = !line.isTripped;

      const logMsg: GridEventLog = {
        id: `trip-action-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: nextStatus ? 'trip' : 'info',
        message: `MANUAL BREAKER ACTION: ${line.name} [${line.voltageKV}kV] ${nextStatus ? 'TRIPPED OPEN' : 'RECLOSED / ENERGIZED'}.`,
      };

      return {
        lines: state.lines.map((l) =>
          l.id === lineId
            ? { ...l, isTripped: nextStatus, curFlowMW: nextStatus ? 0 : l.curFlowMW }
            : l
        ),
        eventLogs: [logMsg, ...state.eventLogs].slice(0, 80),
      };
    });
  },

  toggleGenStatus: (genId: string) => {
    set((state) => {
      const gen = state.generators.find((g) => g.id === genId);
      if (!gen) return state;
      const nextStatus = gen.status === 'online' ? 'tripped' : 'online';

      const logMsg: GridEventLog = {
        id: `gen-trip-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: nextStatus === 'tripped' ? 'alert' : 'info',
        message: `GENERATOR DISPATCH: ${gen.name} ${nextStatus === 'tripped' ? 'TRIPPED OFFLINE' : 'SYNCHRONIZED TO GRID'}.`,
      };

      return {
        generators: state.generators.map((g) =>
          g.id === genId ? { ...g, status: nextStatus } : g
        ),
        eventLogs: [logMsg, ...state.eventLogs].slice(0, 80),
      };
    });
  },

  setGenTargetMW: (genId: string, targetMW: number) => {
    set((state) => ({
      generators: state.generators.map((g) =>
        g.id === genId
          ? { ...g, targetMW: Math.max(g.pMinMW, Math.min(g.pMaxMW, targetMW)) }
          : g
      ),
    }));
  },

  toggleLoadShed: (loadId: string) => {
    set((state) => {
      const load = state.loads.find((l) => l.id === loadId);
      if (!load) return state;
      const nextShed = !load.isShed;

      const logMsg: GridEventLog = {
        id: `load-shed-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: nextShed ? 'warn' : 'info',
        message: `LOAD CONTINGENCY: ${load.name} ${nextShed ? 'SHED FROM FEEDER' : 'RESTORED'}.`,
      };

      return {
        loads: state.loads.map((l) =>
          l.id === loadId ? { ...l, isShed: nextShed } : l
        ),
        eventLogs: [logMsg, ...state.eventLogs].slice(0, 80),
      };
    });
  },

  setBaseDemandScale: (scale: number) => {
    set((state) => ({
      telemetry: { ...state.telemetry, baseDemandScale: Math.max(0.5, Math.min(1.5, scale)) },
    }));
  },

  toggleAGC: () => {
    set((state) => {
      const nextAGC = !state.telemetry.agcActive;
      const logMsg: GridEventLog = {
        id: `agc-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'agc',
        message: `AGC GOVERNOR: Switched to ${nextAGC ? 'AUTOMATIC AREA CONTROL (AGC)' : 'MANUAL DISPATCH'}.`,
      };

      return {
        telemetry: { ...state.telemetry, agcActive: nextAGC },
        eventLogs: [logMsg, ...state.eventLogs].slice(0, 80),
      };
    });
  },

  setNominalFreq: (nominal: 50.00 | 60.00) => {
    set((state) => ({
      telemetry: { ...state.telemetry, nominalFreqHz: nominal, frequencyHz: nominal },
      frequencyHistory: Array(100).fill(nominal),
    }));
  },

  triggerMasterContingency: () => {
    // Trip Titan Point Unit 1 & Highland Backbone Line simultaneously (N-2 Contingency)
    set((state) => {
      const logMsg: GridEventLog = {
        id: `master-trip-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'alert',
        message: `🚨 MASTER CONTINGENCY TRIGGERED: Simultaneous N-2 event! Titan Nuclear tripped & Highland Backbone severed!`,
      };

      return {
        generators: state.generators.map((g) =>
          g.id === 'GEN-NUC-01' ? { ...g, status: 'tripped', curMW: 0 } : g
        ),
        lines: state.lines.map((l) =>
          l.id === 'TL-500-01' ? { ...l, isTripped: true, curFlowMW: 0 } : l
        ),
        eventLogs: [logMsg, ...state.eventLogs].slice(0, 80),
      };
    });
  },

  resetGrid: () => {
    const fresh = getInitialScenario();
    set((state) => ({
      generators: fresh.generators,
      substations: fresh.substations,
      loads: fresh.loads,
      lines: fresh.lines,
      telemetry: {
        ...state.telemetry,
        frequencyHz: state.telemetry.nominalFreqHz,
        baseDemandScale: 1.0,
      },
      frequencyHistory: Array(100).fill(state.telemetry.nominalFreqHz),
      eventLogs: [
        {
          id: `reset-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'info' as const,
          message: 'System Breakers and Synchronizers reset to normal nominal operating schedule.',
        },
        ...state.eventLogs,
      ].slice(0, 80),
    }));
  },

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  addLog: (log) => {
    set((state) => ({
      eventLogs: [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          ...log,
        },
        ...state.eventLogs,
      ].slice(0, 80),
    }));
  },

  exportGridStateJSON: () => {
    const state = get();
    const exportData = {
      timestamp: new Date().toISOString(),
      telemetry: state.telemetry,
      generators: state.generators,
      substations: state.substations,
      loads: state.loads,
      lines: state.lines,
    };
    return JSON.stringify(exportData, null, 2);
  },
}));
