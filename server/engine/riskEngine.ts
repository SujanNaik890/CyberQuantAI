import { AttackCategory, RiskCategory } from '../../src/engine/cyberModels';

export interface GridAssetSnapshot {
  id: string;
  name: string;
  type: 'generator' | 'substation' | 'load' | 'line';
  curMW: number;
  ratedCapacityMW: number;
  status: string;
  criticalityTier: 1 | 2 | 3;
}

export interface RiskEvaluationResult {
  riskScore: number; // 0 - 100
  riskCategory: RiskCategory;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  likelihoodScore: number;
  criticalityScore: number;
  affectedGenerationMW: number;
  gridImpactSummary: string;
  recommendedAction: string;
  explanation: string;
}

const CATEGORY_SEVERITY_WEIGHTS: Record<AttackCategory, number> = {
  unauthorized_scada_access: 85,
  abnormal_generator_shutdown: 95,
  suspicious_substation_switching: 90,
  unauthorized_control_command: 88,
  unauthorized_agc_modification: 82,
  transmission_line_trip: 80,
  malware_detected: 75,
  repeated_auth_failure: 45,
  suspicious_remote_login: 55,
  abnormal_grid_telemetry: 50,
  dos_attack: 60,
  data_exfiltration: 65,
  unknown: 40,
};

export function evaluateCyberRisk(
  attackCategory: AttackCategory,
  confidenceLevel: number,
  asset: GridAssetSnapshot | null,
  currentFreqDeltaHz: number
): RiskEvaluationResult {
  const catWeight = CATEGORY_SEVERITY_WEIGHTS[attackCategory] || 50;

  // Asset criticality score (0 - 100)
  let assetCriticality = 50;
  let affectedMW = 0;

  if (asset) {
    affectedMW = asset.curMW || asset.ratedCapacityMW || 100;
    if (asset.type === 'generator') {
      assetCriticality = asset.ratedCapacityMW > 700 ? 95 : 80;
    } else if (asset.type === 'substation') {
      assetCriticality = 85;
    } else if (asset.type === 'line') {
      assetCriticality = 70;
    } else if (asset.type === 'load') {
      assetCriticality = asset.criticalityTier === 1 ? 90 : 65;
    }
  }

  // Frequency instability multiplier (if grid frequency already deviating)
  const freqDeviationFactor = Math.min(25, Math.abs(currentFreqDeltaHz) * 20);

  // Attack likelihood based on confidence & category
  const likelihood = Math.min(1.0, Math.max(0.2, confidenceLevel));

  // Raw weighted computation
  // Score = (CatWeight * 0.4) + (AssetCrit * 0.35) + (Likelihood * 25) + FreqBonus
  const rawScore = (catWeight * 0.4) + (assetCriticality * 0.35) + (likelihood * 25) + freqDeviationFactor;
  const riskScore = Math.min(100, Math.max(5, Math.round(rawScore)));

  let riskCategory: RiskCategory = 'low';
  let severity: 'info' | 'warning' | 'critical' | 'emergency' = 'info';

  if (riskScore >= 75) {
    riskCategory = 'critical';
    severity = riskScore >= 90 ? 'emergency' : 'critical';
  } else if (riskScore >= 50) {
    riskCategory = 'high';
    severity = 'critical';
  } else if (riskScore >= 25) {
    riskCategory = 'medium';
    severity = 'warning';
  } else {
    riskCategory = 'low';
    severity = 'info';
  }

  // Recommended security actions
  let recommendedAction = 'Monitor security event logs and inspect incoming network packets.';
  switch (attackCategory) {
    case 'abnormal_generator_shutdown':
    case 'unauthorized_scada_access':
      recommendedAction = 'Immediately isolate SCADA gateway, switch plant to manual governor control, and verify PLC integrity.';
      break;
    case 'suspicious_substation_switching':
      recommendedAction = 'Lock out remote breaker actuation on substation RTU; dispatch field engineer for physical interlock verification.';
      break;
    case 'unauthorized_control_command':
    case 'unauthorized_agc_modification':
      recommendedAction = 'Revoke active operator tokens, disable automatic remote AGC telemetry, and revert to local dispatch curve.';
      break;
    case 'repeated_auth_failure':
      recommendedAction = 'Throttle originating IP, enforce MFA challenge, and verify whether brute force breached boundary perimeter.';
      break;
    default:
      recommendedAction = 'Quarantine source ingress port, capture pcap dumps, and alert OT SOC team.';
      break;
  }

  const gridImpactSummary = asset 
    ? `${asset.name} exposed. Risk to ${Math.round(affectedMW)} MW active throughput. Frequency deviation factor: +${freqDeviationFactor.toFixed(1)}.`
    : `Unknown asset target. System monitoring active.`;

  const explanation = `Score ${riskScore}/100 assigned based on Attack Severity (${catWeight}/100), Target Criticality (${assetCriticality}/100), Telemetry Confidence (${Math.round(likelihood * 100)}%), and Grid Dynamic Strain (${freqDeviationFactor.toFixed(1)}).`;

  return {
    riskScore,
    riskCategory,
    severity,
    likelihoodScore: Math.round(likelihood * 100),
    criticalityScore: assetCriticality,
    affectedGenerationMW: affectedMW,
    gridImpactSummary,
    recommendedAction,
    explanation,
  };
}
