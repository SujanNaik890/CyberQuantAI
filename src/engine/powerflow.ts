import { Generator, Substation, LoadCenter, TransmissionLine, GridTelemetry, GridEventLog } from './gridModel';

/**
 * Solve DC Power Flow with Bus Phase Angles & Admittance Matrix
 */
export function solveDCPowerFlow(
  substations: Substation[],
  lines: TransmissionLine[],
  netBusInjections: Map<string, number>
): { busAngles: Map<string, number>; lineFlows: Map<string, { flowMW: number; lossMW: number }> } {
  const busAngles = new Map<string, number>();
  
  const slackBusId = substations.find(s => s.busStatus === 'energized')?.id || substations[0]?.id || '';
  
  substations.forEach((s) => {
    busAngles.set(s.id, 0);
  });

  const activeLines = lines.filter(l => !l.isTripped);
  const MAX_ITER = 60;
  const RELAXATION = 1.15;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    for (const sub of substations) {
      if (sub.id === slackBusId || sub.busStatus !== 'energized') {
        busAngles.set(sub.id, 0);
        continue;
      }

      const pInj = netBusInjections.get(sub.id) || 0;
      const P_pu = pInj / 100.0;

      let sumB_theta = 0;
      let sumB = 0;

      for (const line of activeLines) {
        if (line.reactance_X <= 0) continue;
        const b = 1.0 / line.reactance_X;

        if (line.fromNodeId === sub.id) {
          const otherAngle = busAngles.get(line.toNodeId) || 0;
          sumB += b;
          sumB_theta += b * otherAngle;
        } else if (line.toNodeId === sub.id) {
          const otherAngle = busAngles.get(line.fromNodeId) || 0;
          sumB += b;
          sumB_theta += b * otherAngle;
        }
      }

      if (sumB > 0.0001) {
        const targetTheta = (P_pu + sumB_theta) / sumB;
        const currentTheta = busAngles.get(sub.id) || 0;
        busAngles.set(sub.id, currentTheta + RELAXATION * (targetTheta - currentTheta));
      }
    }
  }

  const lineFlows = new Map<string, { flowMW: number; lossMW: number }>();
  for (const line of lines) {
    if (line.isTripped) {
      lineFlows.set(line.id, { flowMW: 0, lossMW: 0 });
      continue;
    }

    const thetaFrom = busAngles.get(line.fromNodeId) || 0;
    const thetaTo = busAngles.get(line.toNodeId) || 0;
    const x = Math.max(0.001, line.reactance_X);
    const flow_pu = (thetaFrom - thetaTo) / x;
    const flowMW = flow_pu * 100.0;

    const vFactor = Math.max(1, line.voltageKV / 100);
    const lossMW = Math.min(Math.abs(flowMW) * 0.15, (flowMW * flowMW * line.resistance_R) / (vFactor * 50));

    lineFlows.set(line.id, { flowMW, lossMW });
  }

  return { busAngles, lineFlows };
}

export function stepSimulation(
  generators: Generator[],
  substations: Substation[],
  loads: LoadCenter[],
  lines: TransmissionLine[],
  telemetry: GridTelemetry,
  dt: number,
  onLog: (event: GridEventLog) => void
): {
  generators: Generator[];
  substations: Substation[];
  loads: LoadCenter[];
  lines: TransmissionLine[];
  telemetry: GridTelemetry;
} {
  const newGenerators = generators.map(g => ({ ...g, simMetrics: { ...g.simMetrics } }));
  const newSubstations = substations.map(s => ({ ...s }));
  const newLoads = loads.map(l => ({ ...l }));
  const newLines = lines.map(l => ({ ...l }));

  // 1. Calculate active demand per load center
  let totalDemandMW = 0;
  for (const load of newLoads) {
    if (load.isShed) {
      load.curDemandMW = 0;
    } else {
      load.curDemandMW = load.baseDemandMW * telemetry.baseDemandScale;
      totalDemandMW += load.curDemandMW;
    }
  }

  // 2. Calculate current active generation
  let totalGenMW = 0;
  for (const gen of newGenerators) {
    if (gen.status === 'online') {
      totalGenMW += gen.curMW;
    } else {
      gen.curMW = 0;
    }
  }

  // 3. AGC / Governor
  const powerImbalanceMW = totalGenMW - totalDemandMW - telemetry.netLossesMW;

  if (telemetry.agcActive) {
    if (powerImbalanceMW < -5) {
      const neededMW = Math.abs(powerImbalanceMW);
      let remaining = neededMW;
      const capableGens = newGenerators
        .filter(g => g.status === 'online' && g.curMW < g.pMaxMW)
        .sort((a, b) => a.marginalCost_MWh - b.marginalCost_MWh);

      for (const gen of capableGens) {
        const headroom = gen.pMaxMW - gen.curMW;
        const maxRamp = gen.rampRateMW_s * dt;
        const rampAmount = Math.min(remaining, headroom, maxRamp);
        gen.curMW = Math.min(gen.pMaxMW, gen.curMW + rampAmount);
        remaining -= rampAmount;
        if (remaining <= 0) break;
      }
    } else if (powerImbalanceMW > 5) {
      const surplusMW = powerImbalanceMW;
      let remaining = surplusMW;
      const capableGens = newGenerators
        .filter(g => g.status === 'online' && g.curMW > g.pMinMW)
        .sort((a, b) => b.marginalCost_MWh - a.marginalCost_MWh);

      for (const gen of capableGens) {
        const reducible = gen.curMW - gen.pMinMW;
        const maxRamp = gen.rampRateMW_s * dt;
        const dropAmount = Math.min(remaining, reducible, maxRamp);
        gen.curMW = Math.max(gen.pMinMW, gen.curMW - dropAmount);
        remaining -= dropAmount;
        if (remaining <= 0) break;
      }
    }
  } else {
    for (const gen of newGenerators) {
      if (gen.status === 'online') {
        const diff = gen.targetMW - gen.curMW;
        if (Math.abs(diff) > 0.1) {
          const maxRamp = gen.rampRateMW_s * dt;
          if (diff > 0) {
            gen.curMW = Math.min(gen.targetMW, gen.curMW + maxRamp);
          } else {
            gen.curMW = Math.max(gen.targetMW, gen.curMW - maxRamp);
          }
        }
      }
    }
  }

  // Dynamic simulation parameters for each generator type
  for (const gen of newGenerators) {
    const isOnline = gen.status === 'online';
    const outputRatio = isOnline ? gen.curMW / gen.pMaxMW : 0;

    if (gen.type === 'nuclear') {
      // Nuclear: Core Temp and Neutron Flux
      const targetTemp = isOnline ? 280 + outputRatio * 60 : 65;
      gen.simMetrics.primaryParamValue += (targetTemp - gen.simMetrics.primaryParamValue) * 0.05;
      gen.simMetrics.secondaryParamValue = isOnline ? outputRatio * 100 : 0;
    } else if (gen.type === 'hydro') {
      // Hydro: Water Flow and Head Height
      const targetFlow = isOnline ? outputRatio * 520 : 0;
      gen.simMetrics.primaryParamValue += (targetFlow - gen.simMetrics.primaryParamValue) * 0.1;
      gen.simMetrics.secondaryParamValue = Math.max(120, 150 - (gen.simMetrics.primaryParamValue / 500) * 15);
    } else if (gen.type === 'solar_pv') {
      // Solar: Irradiance and Inverter Temp
      const targetIrradiance = isOnline ? 700 + outputRatio * 350 : 0;
      gen.simMetrics.primaryParamValue += (targetIrradiance - gen.simMetrics.primaryParamValue) * 0.08;
      gen.simMetrics.secondaryParamValue = isOnline ? 35 + outputRatio * 25 : 24;
    } else if (gen.type === 'wind') {
      // Wind: Wind Velocity and Rotor RPM
      const targetWind = isOnline ? 6 + outputRatio * 9 : 0;
      gen.simMetrics.primaryParamValue += (targetWind - gen.simMetrics.primaryParamValue) * 0.08;
      gen.simMetrics.secondaryParamValue = isOnline ? (gen.simMetrics.primaryParamValue / 15) * 22 : 0;
    }
  }

  totalGenMW = newGenerators.reduce((sum, g) => sum + (g.status === 'online' ? g.curMW : 0), 0);

  // 4. Net bus injections
  const netInjections = new Map<string, number>();
  newSubstations.forEach(s => netInjections.set(s.id, 0));

  for (const gen of newGenerators) {
    if (gen.status === 'online' && netInjections.has(gen.connectedBusId)) {
      netInjections.set(
        gen.connectedBusId,
        (netInjections.get(gen.connectedBusId) || 0) + gen.curMW
      );
    }
  }

  for (const load of newLoads) {
    if (!load.isShed && netInjections.has(load.connectedBusId)) {
      netInjections.set(
        load.connectedBusId,
        (netInjections.get(load.connectedBusId) || 0) - load.curDemandMW
      );
    }
  }

  // 5. Solve power flow
  const { busAngles, lineFlows } = solveDCPowerFlow(newSubstations, newLines, netInjections);

  newSubstations.forEach(sub => {
    sub.voltageAngleRad = busAngles.get(sub.id) || 0;
  });

  let netLosses = 0;
  for (const line of newLines) {
    const calc = lineFlows.get(line.id);
    if (calc) {
      const genFeed = newGenerators.find(g => g.id === line.fromNodeId);
      const loadFeed = newLoads.find(l => l.id === line.toNodeId);

      if (genFeed) {
        line.curFlowMW = genFeed.status === 'online' ? genFeed.curMW : 0;
        line.lossMW = Math.abs(line.curFlowMW) * 0.005;
      } else if (loadFeed) {
        line.curFlowMW = loadFeed.isShed ? 0 : loadFeed.curDemandMW;
        line.lossMW = Math.abs(line.curFlowMW) * 0.005;
      } else {
        line.curFlowMW = calc.flowMW;
        line.lossMW = calc.lossMW;
      }

      netLosses += line.lossMW;

      const utilization = Math.abs(line.curFlowMW) / line.thermalLimitMW;
      if (!line.isTripped && utilization > 1.0) {
        line.overloadDuration_s += dt;
        if (line.overloadDuration_s >= 3.0) {
          line.isTripped = true;
          line.curFlowMW = 0;
          line.lossMW = 0;
          onLog({
            id: `trip-${Date.now()}-${line.id}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'trip',
            message: `AUTOMATIC OVERLOAD TRIP: ${line.name} exceeded thermal limit for >3s. Breakers opened!`,
          });
        }
      } else {
        line.overloadDuration_s = Math.max(0, line.overloadDuration_s - dt * 2);
      }
    }
  }

  // 6. Swing Equation
  const netActiveImbalance = totalGenMW - totalDemandMW - netLosses;
  const H = 4.5;
  const D = 0.8;
  const S_base = 3500;

  const freqDelta = telemetry.frequencyHz - telemetry.nominalFreqHz;
  const df_dt = ((telemetry.nominalFreqHz / (2 * H * S_base)) * netActiveImbalance) - (D * freqDelta / H);
  
  let newFrequency = telemetry.frequencyHz + df_dt * dt;
  const jitter = (Math.random() - 0.5) * 0.006;
  newFrequency = Math.max(45.0, Math.min(55.0, newFrequency + jitter));

  // 7. Under-Frequency Load Shedding (UFLS)
  const uflsThreshold = telemetry.nominalFreqHz - 1.5;
  if (newFrequency < uflsThreshold) {
    const eligibleLoads = newLoads
      .filter(l => !l.isShed)
      .sort((a, b) => b.priorityTier - a.priorityTier);

    if (eligibleLoads.length > 0) {
      const shedTarget = eligibleLoads[0];
      shedTarget.isShed = true;
      shedTarget.curDemandMW = 0;
      onLog({
        id: `ufls-${Date.now()}-${shedTarget.id}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'alert',
        message: `EMERGENCY UFLS TRIGGERED (Freq: ${newFrequency.toFixed(2)} Hz): Shed load at ${shedTarget.name} to avert blackout!`,
      });
    }
  }

  newSubstations.forEach(sub => {
    let throughput = 0;
    newLines.forEach(l => {
      if (!l.isTripped && (l.fromNodeId === sub.id || l.toNodeId === sub.id)) {
        throughput += Math.abs(l.curFlowMW);
      }
    });
    sub.activeThroughputMW = Math.round(throughput / 2);
  });

  return {
    generators: newGenerators,
    substations: newSubstations,
    loads: newLoads,
    lines: newLines,
    telemetry: {
      ...telemetry,
      frequencyHz: newFrequency,
      totalGenMW: Math.round(totalGenMW * 10) / 10,
      totalDemandMW: Math.round(totalDemandMW * 10) / 10,
      netLossesMW: Math.round(netLosses * 10) / 10,
      frequencyDeltaHz: newFrequency - telemetry.nominalFreqHz,
    },
  };
}
