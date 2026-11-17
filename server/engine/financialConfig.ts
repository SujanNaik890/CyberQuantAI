// ============================================================
// Financial Configuration & Configurable Assumptions
// ============================================================

export interface FinancialConfig {
  /** Currency symbol (e.g. ₹ or $) */
  currencySymbol: string;
  /** Currency code (e.g. INR or USD) */
  currencyCode: string;
  /** Normal generation base cost per kWh (default ~ ₹3.50 / kWh or $0.045) */
  normalCostPerKWh: number;
  /** Replacement market purchase price per kWh during emergency (e.g. ₹12.00 / kWh or $0.15) */
  replacementCostPerKWh: number;
  /** Value of Lost Load (VoLL) / unserved electricity economic impact per MWh (e.g. ₹45,000 / MWh) */
  economicImpactPerMWh: number;
  /** Base investigation & forensic recovery cost per incident */
  baseForensicRecoveryCost: number;
  /** System reconfiguration & hardware replacement cost multiplier */
  hardwareReconfigurationCost: number;
  /** Regulatory & reporting penalty baseline */
  compliancePenaltyCost: number;
  /** Default estimated incident frequency per year (ALE baseline) */
  defaultAnnualLossFrequency: number;
}

export const DEFAULT_FINANCIAL_CONFIG: FinancialConfig = {
  currencySymbol: '₹',
  currencyCode: 'INR',
  normalCostPerKWh: 3.50, // ₹3.50 per unit base KPCL/NPCIL blended cost
  replacementCostPerKWh: 12.50, // Spot market peak emergency exchange rate (IEX)
  economicImpactPerMWh: 50000.0, // Commercial/industrial loss per unserved MWh
  baseForensicRecoveryCost: 1500000.0, // ₹15 Lakhs for incident response, DFIR, logs
  hardwareReconfigurationCost: 3500000.0, // ₹35 Lakhs for RTU/PLC firmware flash & OT isolation
  compliancePenaltyCost: 1000000.0, // ₹10 Lakhs regulatory reporting & audit
  defaultAnnualLossFrequency: 1.2, // ~1.2 expected high-impact cyber events/year
};
