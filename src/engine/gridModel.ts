export type GeneratorType = 'nuclear' | 'hydro' | 'thermal_gas' | 'solar_pv' | 'wind';

export interface Generator {
  id: string;
  name: string;
  type: GeneratorType;
  voltageRating: number; // e.g. 500, 220 kV
  pMinMW: number;
  pMaxMW: number;
  curMW: number;
  targetMW: number; // Setpoint target
  rampRateMW_s: number;
  marginalCost_MWh: number;
  status: 'online' | 'tripped';
  connectedBusId: string; // Substation or direct node ID
  x: number;
  y: number;
}

export interface Substation {
  id: string;
  name: string;
  highVoltageKV: number;
  lowVoltageKV: number;
  busStatus: 'energized' | 'de-energized';
  activeThroughputMW: number;
  voltageAngleRad: number; // Bus phase angle theta
  x: number;
  y: number;
}

export type LoadType = 'industrial' | 'residential' | 'commercial';

export interface LoadCenter {
  id: string;
  name: string;
  type: LoadType;
  baseDemandMW: number;
  curDemandMW: number;
  priorityTier: 1 | 2 | 3; // 1 = Critical (Hospital/Datacenter), 2 = Urban, 3 = Heavy Industrial (shed first)
  isShed: boolean;
  connectedBusId: string; // Substation ID
  x: number;
  y: number;
}

export interface TransmissionLine {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  voltageKV: number;
  reactance_X: number; // Per-unit or ohms (typically 0.05 to 0.25)
  resistance_R: number;
  thermalLimitMW: number;
  curFlowMW: number; // Signed: positive = from -> to, negative = to -> from
  isTripped: boolean;
  lossMW: number;
  overloadDuration_s: number; // Track overload for auto-trip (> 3.0s)
}

export interface GridEventLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'alert' | 'trip' | 'agc';
  message: string;
}

export interface GridTelemetry {
  frequencyHz: number;
  totalGenMW: number;
  totalDemandMW: number;
  netLossesMW: number;
  frequencyDeltaHz: number;
  nominalFreqHz: 50.00 | 60.00;
  agcActive: boolean;
  baseDemandScale: number; // 0.5 to 1.5
  simulationSpeed: number; // 1x, 2x, etc.
}

export interface GridScenario {
  generators: Generator[];
  substations: Substation[];
  loads: LoadCenter[];
  lines: TransmissionLine[];
}
