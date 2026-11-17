import { Generator, Substation, LoadCenter, TransmissionLine, GridTelemetry, GridEventLog } from './gridModel';

/**
 * Solve DC Power Flow with Bus Phase Angles & Admittance Matrix
 * DC Flow: P_ij = (theta_i - theta_j) / X_ij
 * For each node: Net Injection P_i = Sum_j [ (theta_i - theta_j) / X_ij ]
 * We solve for theta via Gauss-Seidel / Jacobi relaxation with slack bus pinned at 0 rad.
 */
export function solveDCPowerFlow(
  substations: Substation[],
  lines: TransmissionLine[],
  netBusInjections: Map<string, number> // Bus ID -> net MW injected (Gen - Load)
): { busAngles: Map<string, number>; lineFlows: Map<string, { flowMW: number; lossMW: number }> } {
  const busAngles = new Map<string, number>();
  
  // Select Slack Bus (First energized substation or SUB-NORTH-500)
  const slackBusId = substations.find(s => s.busStatus === 'energized')?.id || substations[0]?.id || '';
  
  // Initialize angles
  substations.forEach((s) => {
    busAngles.set(s.id, 0);
  });

  // Filter active lines (not tripped and connected buses exist)
  const activeLines = lines.filter(l => !l.isTripped);

  // Iterative relaxation solver (50 iterations is plenty for 4-20 bus convergence)
  const MAX_ITER = 60;
  const RELAXATION = 1.15; // Successive over-relaxation factor

  for (let iter = 0; iter < MAX_ITER; iter++) {
    for (const sub of substations) {
      if (sub.id === slackBusId || sub.busStatus !== 'energized') {
        busAngles.set(sub.id, 0);
        continue;
      }

      const pInj = netBusInjections.get(sub.id) || 0; // Net injection in MW
      // Base MVA = 100 MVA, P_pu = P_MW / 100
      const P_pu = pInj / 100.0;

      let sumB_theta = 0;
      let sumB = 0;

      for (const line of activeLines) {
        if (line.reactance_X <= 0) continue;
        const b = 1.0 / line.reactance_X; // susceptance

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
        // P_i = sumB * theta_i - sumB_theta => theta_i = (P_i + sumB_theta) / sumB
        const targetTheta = (P_pu + sumB_theta) / sumB;
        const currentTheta = busAngles.get(sub.id) || 0;
        busAngles.set(sub.id, currentTheta + RELAXATION * (targetTheta - currentTheta));
      }
    }
  }

  // Calculate resulting branch flows: P_ij = (theta_i - theta_j) / X_ij * S_base
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
    const flowMW = flow_pu * 100.0; // Scaled to MW

    // Losses approximate: I^2 * R = (P/V)^2 * R
    // Simplified AC/DC power loss: P_loss = flow^2 * R / (V_base/100)^2
    const vFactor = Math.max(1, line.voltageKV / 100);
    const lossMW = Math.min(Math.abs(flowMW) * 0.15, (flowMW * flowMW * line.resistance_R) / (vFactor * 50));

    lineFlows.set(line.id, { flowMW, lossMW });
  }

  return { busAngles, lineFlows };
}

/**
 * Step simulation physics by dt seconds:
 * 1. Automatic Generation Control (AGC) & Governor ramp
 * 2. Net bus injections calculation
 * 3. Power flow solve
 * 4. Swing equation for dynamic frequency
 * 5. Automatic Under-Frequency Load Shedding (UFLS) if < 48.5 Hz
 * 6. Line thermal overload detection & auto-trip
 */
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
  const newGenerators = generators.map(g => ({ ...g }));
  const newSubstations = substations.map(s => ({ ...s }));
  const newLoads = loads.map(l => ({ ...l }));
  const newLines = lines.map(l => ({ ...l }));

  // 1. Calculate active demand per load center with baseDemandScale
  let totalDemandMW = 0;
  for (const load of newLoads) {
    if (load.isShed) {
      load.curDemandMW = 0;
    } else {
      load.curDemandMW = load.baseDemandMW * telemetry.baseDemandScale;
      totalDemandMW += load.curDemandMW;
    }
  }

  // Calculate current active generation
  let totalGenMW = 0;
  for (const gen of newGenerators) {
    if (gen.status === 'online') {
      totalGenMW += gen.curMW;
    } else {
      gen.curMW = 0;
    }
  }

  // 2. AGC / Automatic Governor:
  // If AGC is ON, dispatch online generators to eliminate power imbalance (Gen vs Demand + estimated loss)
  const powerImbalanceMW = totalGenMW - totalDemandMW - telemetry.netLossesMW;

  if (telemetry.agcActive) {
    // Sort online generators by marginal cost (economic dispatch)
    // If deficit: ramp cheapest with spare capacity up
    // If surplus: ramp most expensive generator down
    if (powerImbalanceMW < -5) {
      // Deficit: need more generation
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
      // Surplus: need less generation
      const surplusMW = powerImbalanceMW;
      let remaining = surplusMW;
      
      const capableGens = newGenerators
        .filter(g => g.status === 'online' && g.curMW > g.pMinMW)
        .sort((a, b) => b.marginalCost_MWh - a.marginalCost_MWh); // Drop high cost first

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
    // Manual Setpoint adjustment ramp: ramp generators towards targetMW
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

  // Recalculate totalGenMW after ramp
  totalGenMW = newGenerators.reduce((sum, g) => sum + (g.status === 'online' ? g.curMW : 0), 0);

  // 3. Compute net bus injection per substation
  // Generators and Loads feed into substations (via direct lines or connectedBusId)
  const netInjections = new Map<string, number>();
  newSubstations.forEach(s => netInjections.set(s.id, 0));

  // Direct injection from connected generators
  for (const gen of newGenerators) {
    if (gen.status === 'online' && netInjections.has(gen.connectedBusId)) {
      netInjections.set(
        gen.connectedBusId,
        (netInjections.get(gen.connectedBusId) || 0) + gen.curMW
      );
    }
  }

  // Withdrawals from connected loads
  for (const load of newLoads) {
    if (!load.isShed && netInjections.has(load.connectedBusId)) {
      netInjections.set(
        load.connectedBusId,
        (netInjections.get(load.connectedBusId) || 0) - load.curDemandMW
      );
    }
  }

  // 4. Solve power flow on transmission lines
  const { busAngles, lineFlows } = solveDCPowerFlow(newSubstations, newLines, netInjections);

  // Apply angles to substations
  newSubstations.forEach(sub => {
    sub.voltageAngleRad = busAngles.get(sub.id) || 0;
  });

  // Apply calculated flows and check line overloads
  let netLosses = 0;
  for (const line of newLines) {
    const calc = lineFlows.get(line.id);
    if (calc) {
      // If line is direct generator feeder or load feeder, represent directly
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

      // Check thermal limits
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
            message: `AUTOMATIC OVERLOAD TRIP: ${line.name} [Flow: ${Math.round(utilization * 100)}%] exceeded thermal limit for >3s. Breakers opened!`,
          });
        }
      } else {
        line.overloadDuration_s = Math.max(0, line.overloadDuration_s - dt * 2);
      }
    }
  }

  // 5. Dynamic Frequency Physics (Swing Equation & Inertia)
  // Imbalance = TotalGen - TotalLoad - Losses
  const netActiveImbalance = totalGenMW - totalDemandMW - netLosses;
  
  // Grid Inertia Constant H (typical system 4.0 - 5.5 s)
  // df/dt = (f_nom / (2 * H * S_base)) * (P_gen - P_load - P_loss) - D * delta_f
  const H = 4.5; // Inertia constant (seconds)
  const D = 0.8; // System damping constant (MW/Hz)
  const S_base = 3500; // Base apparent power in MVA

  const freqDelta = telemetry.frequencyHz - telemetry.nominalFreqHz;
  const df_dt = ((telemetry.nominalFreqHz / (2 * H * S_base)) * netActiveImbalance) - (D * freqDelta / H);
  
  // Smoothly update frequency
  let newFrequency = telemetry.frequencyHz + df_dt * dt;

  // Add minute realistic sensor jitter (micro-fluctuations +/- 0.008 Hz)
  const jitter = (Math.random() - 0.5) * 0.006;
  newFrequency = Math.max(45.0, Math.min(55.0, newFrequency + jitter));

  // 6. Under-Frequency Load Shedding (UFLS) Trigger:
  // If frequency drops below 48.5 Hz (or 58.5 in 60Hz system), shed lowest priority load immediately!
  const uflsThreshold = telemetry.nominalFreqHz - 1.5;
  if (newFrequency < uflsThreshold) {
    // Find highest tier load (3 = industrial shed first, then 2, etc.)
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
        message: `EMERGENCY UFLS TRIGGERED (Freq: ${newFrequency.toFixed(2)} Hz): Shed load at ${shedTarget.name} [Tier ${shedTarget.priorityTier}] to avert blackout!`,
      });
    }
  }

  // Update substation active throughput
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
