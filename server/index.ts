import express from 'express';
import http from 'http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { initWebSocketServer, broadcastWSMessage } from './ws';
import { evaluateCyberRisk, GridAssetSnapshot } from './engine/riskEngine';
import { calculateFinancialImpact } from './engine/financialEngine';
import { CyberEvent, RiskAlert, FinancialIncident, AssetRiskStatus, FinancialSummary } from '../src/engine/cyberModels';
import { DEFAULT_FINANCIAL_CONFIG } from './engine/financialConfig';

const app = express();
const server = http.createServer(app);

// Allow cross-origin requests from both localhost & local LAN IPs
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize WebSocket on same HTTP server
initWebSocketServer(server);

// Store latest grid state pushed by frontend
let latestGridState: {
  frequencyHz: number;
  totalGenMW: number;
  totalDemandMW: number;
  generators: any[];
  substations: any[];
  loads: any[];
  lines: any[];
} | null = null;

// Preset asset map for immediate asset resolution
const ASSET_CATALOG: Record<string, { name: string; type: 'generator' | 'substation' | 'load' | 'line'; capacity: number }> = {
  'GEN-NUC-KAIGA': { name: 'Kaiga Atomic Power Station (NPCIL)', type: 'generator', capacity: 880 },
  'GEN-HYD-SHARAVATHI': { name: 'Sharavathi Hydroelectric Station (KPCL)', type: 'generator', capacity: 1035 },
  'GEN-SOL-PAVAGADA': { name: 'Pavagada Shakti Sthala Solar Park', type: 'generator', capacity: 900 },
  'GEN-WND-GADAG': { name: 'Kappatagudda Wind Corridor Turbines', type: 'generator', capacity: 450 },
  'SUB-NELAMANGALA-400': { name: 'Nelamangala 400/220kV Master Substation', type: 'substation', capacity: 1450 },
  'SUB-DEVANAHALLI-400': { name: 'Devanahalli 400/220kV Grid Substation', type: 'substation', capacity: 920 },
  'SUB-HOODI-220': { name: 'Hoodi 220/66kV Bulk Primary Substation', type: 'substation', capacity: 980 },
  'SUB-SOMANAHALLI-400': { name: 'Somanahalli 400/220kV Southern Hub', type: 'substation', capacity: 1120 },
  'LOAD-BLR-CBD': { name: 'Bengaluru CBD & Metro Core', type: 'load', capacity: 850 },
  'LOAD-BLR-WHITEFIELD': { name: 'Whitefield & ITPL Tech Hub', type: 'load', capacity: 720 },
  'LOAD-BLR-ELECTRONICITY': { name: 'Electronic City Tech District', type: 'load', capacity: 680 },
  'LOAD-BLR-PEENYA': { name: 'Peenya Industrial Mega Estate', type: 'load', capacity: 550 },
  'TL-400-KAIGA-NELA': { name: 'Kaiga - Nelamangala 400kV D/C Line 1', type: 'line', capacity: 1200 },
  'TL-400-SHARAVATHI-NELA': { name: 'Sharavathi - Nelamangala 400kV Line 2', type: 'line', capacity: 1100 },
  'TL-400-PAVAGADA-DEV': { name: 'Pavagada - Devanahalli 400kV Bulk Corridor', type: 'line', capacity: 1300 },
};

function getAssetSnapshot(targetAssetId: string): GridAssetSnapshot | null {
  // Check live state first
  if (latestGridState) {
    const gen = latestGridState.generators?.find((g) => g.id === targetAssetId);
    if (gen) return { id: gen.id, name: gen.name, type: 'generator', curMW: gen.curMW, ratedCapacityMW: gen.pMaxMW, status: gen.status, criticalityTier: 1 };
    const sub = latestGridState.substations?.find((s) => s.id === targetAssetId);
    if (sub) return { id: sub.id, name: sub.name, type: 'substation', curMW: sub.activeThroughputMW, ratedCapacityMW: 1200, status: sub.busStatus, criticalityTier: 1 };
    const load = latestGridState.loads?.find((l) => l.id === targetAssetId);
    if (load) return { id: load.id, name: load.name, type: 'load', curMW: load.curDemandMW, ratedCapacityMW: load.baseDemandMW, status: load.isShed ? 'shed' : 'active', criticalityTier: load.priorityTier };
    const line = latestGridState.lines?.find((l) => l.id === targetAssetId);
    if (line) return { id: line.id, name: line.name, type: 'line', curMW: line.curFlowMW, ratedCapacityMW: line.thermalLimitMW, status: line.isTripped ? 'tripped' : 'active', criticalityTier: 2 };
  }

  // Fallback to static catalog
  const catalogEntry = ASSET_CATALOG[targetAssetId];
  if (catalogEntry) {
    return {
      id: targetAssetId,
      name: catalogEntry.name,
      type: catalogEntry.type,
      curMW: catalogEntry.capacity * 0.8,
      ratedCapacityMW: catalogEntry.capacity,
      status: 'online',
      criticalityTier: 1,
    };
  }

  return null;
}

// ----------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CyberQuant AI Backend', timestamp: new Date().toISOString() });
});

// Sync grid state from frontend
app.post('/api/grid-state', (req, res) => {
  latestGridState = req.body;
  res.json({ status: 'synchronized' });
});

// Ingest Cyber Security Event (Attacker or SIEM ingress)
app.post('/api/events', (req, res) => {
  try {
    const raw = req.body;
    const eventId = raw.eventId || `EVT-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
    const timestamp = raw.timestamp || new Date().toISOString();
    const sourceIP = raw.sourceIP || req.ip || '192.168.1.150';
    const destIP = raw.destIP || '10.240.10.1';
    const attackCategory = raw.attackCategory || 'unauthorized_scada_access';
    const targetAssetId = raw.targetAssetId || 'GEN-NUC-KAIGA';
    const description = raw.description || 'Remote SCADA unauthorized parameter alteration detected.';
    const detectionSource = raw.detectionSource || 'simulated_attack';
    const attackStatus = raw.attackStatus || 'detected';
    const confidenceLevel = typeof raw.confidenceLevel === 'number' ? raw.confidenceLevel : 0.85;
    const rawPayload = typeof raw.rawPayload === 'string' ? raw.rawPayload : JSON.stringify(raw);

    const cyberEvent: CyberEvent = {
      eventId,
      timestamp,
      sourceIP,
      destIP,
      attackCategory,
      targetAssetId,
      description,
      detectionSource,
      attackStatus,
      confidenceLevel,
      rawPayload,
    };

    // Save event to SQLite
    const insertEvent = db.prepare(`
      INSERT INTO cyber_events (eventId, timestamp, sourceIP, destIP, attackCategory, targetAssetId, description, detectionSource, attackStatus, confidenceLevel, rawPayload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEvent.run(
      cyberEvent.eventId,
      cyberEvent.timestamp,
      cyberEvent.sourceIP,
      cyberEvent.destIP,
      cyberEvent.attackCategory,
      cyberEvent.targetAssetId,
      cyberEvent.description,
      cyberEvent.detectionSource,
      cyberEvent.attackStatus,
      cyberEvent.confidenceLevel,
      cyberEvent.rawPayload
    );

    // Run Risk Evaluation
    const asset = getAssetSnapshot(targetAssetId);
    const freqDelta = latestGridState ? latestGridState.frequencyHz - 50.0 : 0.0;
    const riskEval = evaluateCyberRisk(attackCategory, confidenceLevel, asset, freqDelta);

    // Create Risk Alert
    const alertId = `ALT-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
    const targetAssetName = asset ? asset.name : targetAssetId;

    const riskAlert: RiskAlert = {
      alertId,
      eventId: cyberEvent.eventId,
      timestamp: cyberEvent.timestamp,
      attackType: attackCategory,
      sourceIP,
      targetAssetId,
      targetAssetName,
      riskScore: riskEval.riskScore,
      riskCategory: riskEval.riskCategory,
      affectedGenerationMW: riskEval.affectedGenerationMW,
      currentGridImpact: riskEval.gridImpactSummary,
      recommendedAction: riskEval.recommendedAction,
      explanation: riskEval.explanation,
      severity: riskEval.severity,
      isRead: false,
      isAcknowledged: false,
    };

    const insertAlert = db.prepare(`
      INSERT INTO risk_alerts (alertId, eventId, timestamp, attackType, sourceIP, targetAssetId, targetAssetName, riskScore, riskCategory, affectedGenerationMW, currentGridImpact, recommendedAction, explanation, severity, isRead, isAcknowledged)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `);
    insertAlert.run(
      riskAlert.alertId,
      riskAlert.eventId,
      riskAlert.timestamp,
      riskAlert.attackType,
      riskAlert.sourceIP,
      riskAlert.targetAssetId,
      riskAlert.targetAssetName,
      riskAlert.riskScore,
      riskAlert.riskCategory,
      riskAlert.affectedGenerationMW,
      riskAlert.currentGridImpact,
      riskAlert.recommendedAction,
      riskAlert.explanation,
      riskAlert.severity
    );

    // Run Financial Projection Engine
    const incidentId = `FIN-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
    const financialIncident = calculateFinancialImpact({
      incidentId,
      alertId: riskAlert.alertId,
      eventId: cyberEvent.eventId,
      targetAssetId,
      targetAssetName,
      attackCategory,
      affectedMW: riskEval.affectedGenerationMW,
      ratedCapacityMW: asset ? asset.ratedCapacityMW : 500,
      assumedDurationHours: raw.assumedOutageDurationHrs,
    });

    const insertFinancial = db.prepare(`
      INSERT INTO financial_incidents (
        incidentId, alertId, eventId, timestamp, targetAssetId, targetAssetName, attackCategory,
        affectedGenerationMW, assumedOutageDurationHrs, ratedCapacityMW, replacementElectricityCost,
        normalGenerationCost, unservedElectricityImpact, recoveryExpenses, operationalExpenses,
        totalEstimatedLoss, minExpectedLoss, maxExpectedLoss, annualLossEventFrequency,
        averageLossMagnitude, annualizedExpectedLoss, replacementCostPerKWh, normalCostPerKWh,
        economicImpactPerMWh, calculationExplanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertFinancial.run(
      financialIncident.incidentId,
      financialIncident.alertId,
      financialIncident.eventId,
      financialIncident.timestamp,
      financialIncident.targetAssetId,
      financialIncident.targetAssetName,
      financialIncident.attackCategory,
      financialIncident.affectedGenerationMW,
      financialIncident.assumedOutageDurationHrs,
      financialIncident.ratedCapacityMW,
      financialIncident.replacementElectricityCost,
      financialIncident.normalGenerationCost,
      financialIncident.unservedElectricityImpact,
      financialIncident.recoveryExpenses,
      financialIncident.operationalExpenses,
      financialIncident.totalEstimatedLoss,
      financialIncident.minExpectedLoss,
      financialIncident.maxExpectedLoss,
      financialIncident.annualLossEventFrequency,
      financialIncident.averageLossMagnitude,
      financialIncident.annualizedExpectedLoss,
      financialIncident.replacementCostPerKWh,
      financialIncident.normalCostPerKWh,
      financialIncident.economicImpactPerMWh,
      financialIncident.calculationExplanation
    );

    // Update Asset Risk Cache
    const assetStatus = riskEval.riskScore >= 70 ? 'compromised' : riskEval.riskScore >= 35 ? 'suspicious' : 'normal';
    db.prepare(`
      INSERT INTO asset_risk_cache (assetId, status, riskScore, activeAlertCount, latestAlertId, updatedAt)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(assetId) DO UPDATE SET
        status = excluded.status,
        riskScore = MAX(asset_risk_cache.riskScore, excluded.riskScore),
        activeAlertCount = asset_risk_cache.activeAlertCount + 1,
        latestAlertId = excluded.latestAlertId,
        updatedAt = excluded.updatedAt
    `).run(targetAssetId, assetStatus, riskEval.riskScore, riskAlert.alertId, new Date().toISOString());

    // Broadcast through WebSocket in real-time
    broadcastWSMessage({ type: 'new_event', payload: cyberEvent });
    broadcastWSMessage({ type: 'new_alert', payload: riskAlert });
    broadcastWSMessage({ type: 'new_incident', payload: financialIncident });

    // Broadcast updated asset status list
    const allAssetRisks = db.prepare('SELECT assetId, status, riskScore, activeAlertCount, latestAlertId FROM asset_risk_cache').all() as AssetRiskStatus[];
    broadcastWSMessage({ type: 'asset_risk_update', payload: allAssetRisks });

    return res.status(201).json({
      success: true,
      event: cyberEvent,
      alert: riskAlert,
      financial: financialIncident,
    });
  } catch (err: any) {
    console.error('Error ingesting cyber event:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get all events
app.get('/api/events', (req, res) => {
  const events = db.prepare('SELECT * FROM cyber_events ORDER BY timestamp DESC LIMIT 100').all();
  res.json(events);
});

// Get all alerts
app.get('/api/alerts', (req, res) => {
  const alerts = db.prepare('SELECT * FROM risk_alerts ORDER BY timestamp DESC LIMIT 100').all();
  res.json(alerts.map((a: any) => ({ ...a, isRead: !!a.isRead, isAcknowledged: !!a.isAcknowledged })));
});

// Acknowledge alert
app.put('/api/alerts/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  const user = req.body.acknowledgedBy || 'Operator-Console';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE risk_alerts SET isAcknowledged = 1, acknowledgedBy = ?, acknowledgedAt = ? WHERE alertId = ?
  `).run(user, now, id);

  broadcastWSMessage({ type: 'alert_acknowledged', payload: { alertId: id } });
  res.json({ success: true, alertId: id });
});

// Get all financial incidents
app.get('/api/financial/incidents', (req, res) => {
  const incidents = db.prepare('SELECT * FROM financial_incidents ORDER BY timestamp DESC LIMIT 100').all();
  res.json(incidents.map((i: any) => ({ ...i, isEstimate: true })));
});

// Get aggregate financial summary
app.get('/api/financial/summary', (req, res) => {
  const incidents = db.prepare('SELECT * FROM financial_incidents').all() as FinancialIncident[];

  let totalFinancialExposure = 0;
  let totalReplacementCost = 0;
  let totalRecoveryCost = 0;
  let totalOperationalCost = 0;
  let totalUnservedImpact = 0;

  const assetMap: Record<string, { assetId: string; assetName: string; exposure: number }> = {};
  const incidentExposure: { incidentId: string; loss: number; attackType: any }[] = [];

  for (const inc of incidents) {
    totalFinancialExposure += inc.totalEstimatedLoss;
    totalReplacementCost += inc.replacementElectricityCost;
    totalRecoveryCost += inc.recoveryExpenses;
    totalOperationalCost += inc.operationalExpenses;
    totalUnservedImpact += inc.unservedElectricityImpact;

    if (!assetMap[inc.targetAssetId]) {
      assetMap[inc.targetAssetId] = { assetId: inc.targetAssetId, assetName: inc.targetAssetName, exposure: 0 };
    }
    assetMap[inc.targetAssetId].exposure += inc.totalEstimatedLoss;

    incidentExposure.push({
      incidentId: inc.incidentId,
      loss: inc.totalEstimatedLoss,
      attackType: inc.attackCategory,
    });
  }

  const latestInc = incidents[incidents.length - 1];

  const summary: FinancialSummary = {
    totalFinancialExposure,
    currentIncidentLoss: latestInc ? latestInc.totalEstimatedLoss : 0,
    totalReplacementCost,
    totalRecoveryCost,
    totalOperationalCost,
    totalUnservedImpact,
    incidentCount: incidents.length,
    assetExposure: Object.values(assetMap),
    incidentExposure,
  };

  res.json(summary);
});

// Get per-asset risk statuses
app.get('/api/assets/risk', (req, res) => {
  const risks = db.prepare('SELECT assetId, status, riskScore, activeAlertCount, latestAlertId FROM asset_risk_cache').all();
  res.json(risks);
});

// Reset simulation events / clear for testing
app.post('/api/reset', (req, res) => {
  db.exec(`
    DELETE FROM cyber_events;
    DELETE FROM risk_alerts;
    DELETE FROM financial_incidents;
    DELETE FROM asset_risk_cache;
  `);
  broadcastWSMessage({ type: 'asset_risk_update', payload: [] });
  broadcastWSMessage({
    type: 'financial_summary',
    payload: {
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
  });
  broadcastWSMessage({ type: 'reset_telemetry', payload: {} });
  res.json({ success: true, message: 'CyberQuant threat and financial telemetry reset.' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[CyberQuant AI] Backend ingestion and analytics server running on http://0.0.0.0:${PORT}`);
  console.log(`[CyberQuant AI] WebSocket endpoint ready at ws://0.0.0.0:${PORT}`);
});
