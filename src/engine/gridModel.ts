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
  // Specific simulation telemetry
  simMetrics: {
    efficiency: number; // 0-100%
    primaryParamName: string; // e.g. "Core Temp", "Water Flow", "Wind Velocity", "Solar Irradiance"
    primaryParamValue: number;
    primaryParamUnit: string;
    secondaryParamName: string; // e.g. "Neutron Flux", "Head Height", "RPM", "Inverter Temp"
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
  priorityTier: 1 | 2 | 3; // 1 = Critical, 2 = Urban, 3 = Heavy Industrial
  isShed: boolean;
  connectedBusId: string;
  x: number;
  y: number;
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
  baseDemandScale: number; // 0.5 to 1.5
  simulationSpeed: number;
}

export interface GridScenario {
  generators: Generator[];
  substations: Substation[];
  loads: LoadCenter[];
  lines: TransmissionLine[];
}
