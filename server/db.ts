import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'cyberquant.db');
export const db = new Database(dbPath);

// Initialize Tables
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS cyber_events (
    eventId TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    sourceIP TEXT NOT NULL,
    destIP TEXT NOT NULL,
    attackCategory TEXT NOT NULL,
    targetAssetId TEXT NOT NULL,
    description TEXT NOT NULL,
    detectionSource TEXT NOT NULL,
    attackStatus TEXT NOT NULL,
    confidenceLevel REAL NOT NULL,
    rawPayload TEXT
  );

  CREATE TABLE IF NOT EXISTS risk_alerts (
    alertId TEXT PRIMARY KEY,
    eventId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    attackType TEXT NOT NULL,
    sourceIP TEXT NOT NULL,
    targetAssetId TEXT NOT NULL,
    targetAssetName TEXT NOT NULL,
    riskScore REAL NOT NULL,
    riskCategory TEXT NOT NULL,
    affectedGenerationMW REAL NOT NULL,
    currentGridImpact TEXT NOT NULL,
    recommendedAction TEXT NOT NULL,
    explanation TEXT NOT NULL,
    severity TEXT NOT NULL,
    isRead INTEGER DEFAULT 0,
    isAcknowledged INTEGER DEFAULT 0,
    acknowledgedBy TEXT,
    acknowledgedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS financial_incidents (
    incidentId TEXT PRIMARY KEY,
    alertId TEXT NOT NULL,
    eventId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    targetAssetId TEXT NOT NULL,
    targetAssetName TEXT NOT NULL,
    attackCategory TEXT NOT NULL,
    affectedGenerationMW REAL NOT NULL,
    assumedOutageDurationHrs REAL NOT NULL,
    ratedCapacityMW REAL NOT NULL,
    replacementElectricityCost REAL NOT NULL,
    normalGenerationCost REAL NOT NULL,
    unservedElectricityImpact REAL NOT NULL,
    recoveryExpenses REAL NOT NULL,
    operationalExpenses REAL NOT NULL,
    totalEstimatedLoss REAL NOT NULL,
    minExpectedLoss REAL NOT NULL,
    maxExpectedLoss REAL NOT NULL,
    annualLossEventFrequency REAL NOT NULL,
    averageLossMagnitude REAL NOT NULL,
    annualizedExpectedLoss REAL NOT NULL,
    replacementCostPerKWh REAL NOT NULL,
    normalCostPerKWh REAL NOT NULL,
    economicImpactPerMWh REAL NOT NULL,
    calculationExplanation TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS asset_risk_cache (
    assetId TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    riskScore REAL NOT NULL,
    activeAlertCount INTEGER NOT NULL,
    latestAlertId TEXT,
    updatedAt TEXT NOT NULL
  );
`);
