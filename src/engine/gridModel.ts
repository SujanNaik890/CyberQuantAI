export type GeneratorType = 'nuclear' | 'hydro' | 'thermal_gas' | 'solar_pv' | 'wind';

export interface Generator {
  id: string;
  name: string;
  type: GeneratorType;
  voltageRating: number;
  pMinMW: number;
  pMaxMW: number;
  curMW: number;
  targetMW: number;
  rampRateMW_s: number;
  marginalCost_MWh: number;
  status: 'online' | 'tripped';
  connectedBusId: string;
  location: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  simMetrics: {
    efficiency: number;
    primaryParamName: string;
    primaryParamValue: number;
    primaryParamUnit: string;
    secondaryParamName: string;
    secondaryParamValue: number;
    secondaryParamUnit: string;
  };
}

export interface Substation {
  id: string;
  name: string;
  highVoltageKV: number;
  lowVoltageKV: number;
  busStatus: 'energized' | 'de-energized';
  activeThroughputMW: number;
  voltageAngleRad: number;
  location: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  distributionTransformers: number; // e.g. 11kV step-down feeders
}

export type LoadType = 'industrial' | 'residential' | 'commercial';

export interface LoadCenter {
  id: string;
  name: string;
  type: LoadType;
  baseDemandMW: number;
  curDemandMW: number;
  priorityTier: 1 | 2 | 3;
  isShed: boolean;
  connectedBusId: string;
  location: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  buildingCount: number;
}

export interface TransmissionLine {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  voltageKV: number;
  reactance_X: number;
  resistance_R: number;
  thermalLimitMW: number;
  curFlowMW: number;
  isTripped: boolean;
  lossMW: number;
  overloadDuration_s: number;
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
  baseDemandScale: number;
  simulationSpeed: number;
  scadaDispatched: boolean;
}

export interface GridScenario {
  generators: Generator[];
  substations: Substation[];
  loads: LoadCenter[];
  lines: TransmissionLine[];
}
