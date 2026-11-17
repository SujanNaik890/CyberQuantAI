import http from 'http';

interface AttackScenario {
  name: string;
  category: string;
  targetAssetId: string;
  description: string;
  sourceIP: string;
  confidence: number;
}

const SCENARIOS: Record<string, AttackScenario> = {
  'kaiga-scada': {
    name: 'Kaiga Nuclear SCADA Parameter Manipulation',
    category: 'unauthorized_scada_access',
    targetAssetId: 'GEN-NUC-KAIGA',
    description: 'Unauthorized remote modification of Primary PHWR coolant flow setpoint via compromised maintenance VPN portal.',
    sourceIP: '198.51.100.42',
    confidence: 0.95,
  },
  'sharavathi-trip': {
    name: 'Sharavathi Hydro Governor Trip Injection',
    category: 'abnormal_generator_shutdown',
    targetAssetId: 'GEN-HYD-SHARAVATHI',
    description: 'Malicious Modbus command 0x05 forced penstock gate trip and shut down turbine unit 2.',
    sourceIP: '203.0.113.88',
    confidence: 0.92,
  },
  'nelamangala-switch': {
    name: 'Nelamangala 400kV Substation Breaker Actuation',
    category: 'suspicious_substation_switching',
    targetAssetId: 'SUB-NELAMANGALA-400',
    description: 'IEC 61850 GOOSE packet injection spoofing busbar overcurrent protection to trigger 400kV breaker lockouts.',
    sourceIP: '185.220.101.5',
    confidence: 0.88,
  },
  'pavagada-inverter': {
    name: 'Pavagada Solar Central Inverter Brute Force',
    category: 'repeated_auth_failure',
    targetAssetId: 'GEN-SOL-PAVAGADA',
    description: 'High-volume dictionary attack targeted inverter RTU web interfaces across sector B.',
    sourceIP: '194.26.29.112',
    confidence: 0.74,
  },
  'agc-manipulation': {
    name: 'Grid Frequency AGC Area Control Error Tampering',
    category: 'unauthorized_agc_modification',
    targetAssetId: 'SUB-DEVANAHALLI-400',
    description: 'Tampered AGC governor control packets injected into EMS dispatch ring causing generation throttle.',
    sourceIP: '91.240.118.17',
    confidence: 0.89,
  },
  'peenya-blackout': {
    name: 'Peenya Industrial Feeder Trip Event',
    category: 'transmission_line_trip',
    targetAssetId: 'LOAD-BLR-PEENYA',
    description: 'Compromised distribution SCADA unit sent trip signals to feeder lines feeding industrial estates.',
    sourceIP: '45.154.255.89',
    confidence: 0.83,
  },
};

export async function injectAttackEvent(scenarioKey: string, backendHost = 'localhost', port = 3001) {
  const scenario = SCENARIOS[scenarioKey] || SCENARIOS['kaiga-scada'];

  const postData = JSON.stringify({
    timestamp: new Date().toISOString(),
    sourceIP: scenario.sourceIP,
    destIP: '10.240.10.1',
    attackCategory: scenario.category,
    targetAssetId: scenario.targetAssetId,
    description: scenario.description,
    detectionSource: 'simulated_attack',
    attackStatus: 'confirmed',
    confidenceLevel: scenario.confidence,
  });

  const options = {
    hostname: backendHost,
    port: port,
    path: '/api/events',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

// If invoked from CLI
if (process.argv[1]?.includes('attackSimulator')) {
  const scenarioArg = process.argv[2] || 'kaiga-scada';
  const hostArg = process.argv[3] || 'localhost';
  console.log(`[CyberQuant Attacker Tool] Transmitting simulated cyber strike: "${scenarioArg}" to http://${hostArg}:3001/api/events...`);
  
  injectAttackEvent(scenarioArg, hostArg)
    .then((res) => {
      console.log(`[Success] Telemetry delivered! Ingestion response:`);
      console.log(JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error(`[Error] Failed to transmit event:`, err.message);
    });
}
