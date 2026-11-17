import { FinancialIncident, AttackCategory } from '../../src/engine/cyberModels';
import { FinancialConfig, DEFAULT_FINANCIAL_CONFIG } from './financialConfig';

export interface FinancialCalculationParams {
  incidentId: string;
  alertId: string;
  eventId: string;
  targetAssetId: string;
  targetAssetName: string;
  attackCategory: AttackCategory;
  affectedMW: number;
  ratedCapacityMW: number;
  assumedDurationHours?: number;
  config?: Partial<FinancialConfig>;
}

export function calculateFinancialImpact(params: FinancialCalculationParams): FinancialIncident {
  const cfg = { ...DEFAULT_FINANCIAL_CONFIG, ...(params.config || {}) };
  
  // Default assumed outage duration based on attack type if not specified
  let durationHrs = params.assumedDurationHours || 2.5;
  if (!params.assumedDurationHours) {
    if (params.attackCategory === 'abnormal_generator_shutdown') durationHrs = 4.0;
    else if (params.attackCategory === 'suspicious_substation_switching') durationHrs = 2.0;
    else if (params.attackCategory === 'unauthorized_scada_access') durationHrs = 3.0;
    else durationHrs = 1.5;
  }

  const affectedMW = Math.max(10, params.affectedMW);
  const totalMWh = affectedMW * durationHrs;

  // A. Replacement Electricity Cost
  // Incremental replacement cost = replacement price - normal avoided generation cost
  // MW * duration * 1000 kWh/MWh * (replacement - normal)
  const incrementalCostPerKWh = Math.max(1.0, cfg.replacementCostPerKWh - cfg.normalCostPerKWh);
  const replacementElectricityCost = totalMWh * 1000 * incrementalCostPerKWh;
  const normalGenerationCost = totalMWh * 1000 * cfg.normalCostPerKWh;

  // B. Unserved Electricity Impact
  // Commercial/industrial outage impact (assumed 20% of affected power results in unserved load if spinning reserve falls short)
  const estimatedUnservedMWh = totalMWh * 0.25;
  const unservedElectricityImpact = estimatedUnservedMWh * cfg.economicImpactPerMWh;

  // C. Recovery & Forensic Investigation Expenses
  const recoveryExpenses = cfg.baseForensicRecoveryCost + (affectedMW > 500 ? cfg.hardwareReconfigurationCost * 0.7 : cfg.hardwareReconfigurationCost * 0.3);

  // D. Operational Response & Emergency Crew Expenses
  const operationalExpenses = (durationHrs * 125000) + cfg.compliancePenaltyCost;

  // E. Total Estimated Incident Loss (Strictly non-overlapping)
  const totalEstimatedLoss = replacementElectricityCost + unservedElectricityImpact + recoveryExpenses + operationalExpenses;

  // Min / Max bounds (uncertainty interval ±25%)
  const minExpectedLoss = Math.round(totalEstimatedLoss * 0.75);
  const maxExpectedLoss = Math.round(totalEstimatedLoss * 1.35);

  // Annualized Expected Loss (ALE = ALEF * Average Loss)
  const annualLossEventFrequency = cfg.defaultAnnualLossFrequency;
  const annualizedExpectedLoss = Math.round(totalEstimatedLoss * annualLossEventFrequency);

  const explanation = `Projection model: ${affectedMW.toFixed(0)} MW offline over ${durationHrs.toFixed(1)} hrs (${totalMWh.toFixed(0)} MWh). Incremental replacement power rate: ${cfg.currencySymbol}${incrementalCostPerKWh.toFixed(2)}/kWh (Spread: ${cfg.currencySymbol}${cfg.replacementCostPerKWh} spot vs ${cfg.currencySymbol}${cfg.normalCostPerKWh} base). Includes VoLL on ~${estimatedUnservedMWh.toFixed(0)} MWh unserved energy + OT forensic/restoration overhead.`;

  return {
    incidentId: params.incidentId,
    alertId: params.alertId,
    eventId: params.eventId,
    timestamp: new Date().toISOString(),
    targetAssetId: params.targetAssetId,
    targetAssetName: params.targetAssetName,
    attackCategory: params.attackCategory,
    affectedGenerationMW: affectedMW,
    assumedOutageDurationHrs: durationHrs,
    ratedCapacityMW: params.ratedCapacityMW,
    replacementElectricityCost: Math.round(replacementElectricityCost),
    normalGenerationCost: Math.round(normalGenerationCost),
    unservedElectricityImpact: Math.round(unservedElectricityImpact),
    recoveryExpenses: Math.round(recoveryExpenses),
    operationalExpenses: Math.round(operationalExpenses),
    totalEstimatedLoss: Math.round(totalEstimatedLoss),
    minExpectedLoss,
    maxExpectedLoss,
    annualLossEventFrequency,
    averageLossMagnitude: Math.round(totalEstimatedLoss),
    annualizedExpectedLoss,
    replacementCostPerKWh: cfg.replacementCostPerKWh,
    normalCostPerKWh: cfg.normalCostPerKWh,
    economicImpactPerMWh: cfg.economicImpactPerMWh,
    calculationExplanation: explanation,
    isEstimate: true,
  };
}
