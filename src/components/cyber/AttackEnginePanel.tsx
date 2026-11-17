import React, { useState } from 'react';
import { useGridStore } from '../../store/gridStore';
import { useCyberStore } from '../../store/cyberStore';
import { 
  Skull, 
  Flame, 
  Zap, 
  ShieldAlert, 
  UserX, 
  Key, 
  Server, 
  Building, 
  CheckCircle2, 
  Radio, 
  ChevronRight, 
  Crosshair,
  TrendingUp,
  DollarSign,
  AlertOctagon,
  RefreshCw,
  Terminal
} from 'lucide-react';

interface AttackTypeDef {
  id: string;
  name: string;
  category: string;
  icon: any;
  color: string;
  borderColor: string;
  glowColor: string;
  severity: 'warning' | 'critical' | 'emergency';
  defaultDesc: string;
  protocolVector: string;
  impactMechanism: string;
}

const ATTACK_TYPES: AttackTypeDef[] = [
  {
    id: 'ransomware',
    name: 'Industrial Ransomware',
    category: 'OT Cryptolocker / Locker-G',
    icon: Skull,
    color: 'from-rose-500/20 to-red-600/30 text-rose-400',
    borderColor: 'border-rose-500/60 hover:border-rose-400',
    glowColor: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    severity: 'emergency',
    defaultDesc: 'Targeted Ransomware deployment encrypting engineering workstations, HMI runtime files, and RTU firmware blobs.',
    protocolVector: 'SMBv3 Exploit / EternalBlue Lateral Movement',
    impactMechanism: 'Freezes SCADA Telemetry, locks protection relays, forces full manual emergency breaker trip.',
  },
  {
    id: 'dos_attack',
    name: 'Distributed Denial of Service (DDoS)',
    category: 'Network Flood / Protocol Exhaustion',
    icon: Flame,
    color: 'from-amber-500/20 to-orange-600/30 text-amber-400',
    borderColor: 'border-amber-500/60 hover:border-amber-400',
    glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    severity: 'critical',
    defaultDesc: 'Volumetric GOOSE & MMS message packet flood saturating station bus switches and front-end telecontrol processors.',
    protocolVector: 'IEC 61850 GOOSE Flood / DNP3 UDP amplification',
    impactMechanism: 'Overwhelms communication gateways, desynchronizes phasor measurement units, triggers islanding protection.',
  },
  {
    id: 'unauthorized_insider',
    name: 'Unauthorized Insider Browsing',
    category: 'Privilege Abuse & Lateral SCADA Recon',
    icon: UserX,
    color: 'from-purple-500/20 to-indigo-600/30 text-purple-400',
    borderColor: 'border-purple-500/60 hover:border-purple-400',
    glowColor: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    severity: 'critical',
    defaultDesc: 'Disgruntled operator or credential-hijacked employee exfiltrating single-line schematics and tampering with tap-changer limits.',
    protocolVector: 'Compromised VPN Session / Kerberos Ticket Spoofing',
    impactMechanism: 'Disables inter-tripping alarms, suppresses remote telemetry alerts, and alters protection relay setpoints.',
  },
  {
    id: 'credential_stuffing',
    name: 'Credential Stuffing Attack',
    category: 'Automated Identity & Token Infiltration',
    icon: Key,
    color: 'from-cyan-500/20 to-blue-600/30 text-cyan-400',
    borderColor: 'border-cyan-500/60 hover:border-cyan-400',
    glowColor: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
    severity: 'warning',
    defaultDesc: 'High-frequency brute force spray using leaked power-utility breach databases to authenticate against maintenance web interfaces.',
    protocolVector: 'HTTPS Inverter Web UI / SSH Port 22 Brute Spray',
    impactMechanism: 'Injects fake AGC ramp commands, alters transformer thermal limits, and destabilizes grid frequency regulation.',
  },
];

export const AttackEnginePanel: React.FC = () => {
  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);
  const selectGridAsset = useGridStore((s) => s.selectAsset);

  const assetRiskMap = useCyberStore((s) => s.assetRiskMap);
  const launchCustomAttack = useCyberStore((s) => s.launchCustomAttack);
  const financialSummary = useCyberStore((s) => s.financialSummary);
  const alerts = useCyberStore((s) => s.alerts);

  const [selectedAttack, setSelectedAttack] = useState<string>('ransomware');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('GEN-NUC-KAIGA');
  const [targetTypeFilter, setTargetTypeFilter] = useState<'all' | 'substation' | 'load' | 'generator'>('all');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] = useState<any | null>(null);

  // Group all potential targets
  const allTargets = [
    ...substations.map((s) => ({
      id: s.id,
      name: s.name,
      type: 'substation' as const,
      capacity: `${s.highVoltageKV}kV / ${s.activeThroughputMW}MW`,
      location: s.location,
      status: s.busStatus,
      risk: assetRiskMap[s.id]?.riskScore || 0,
      riskStatus: assetRiskMap[s.id]?.status || 'normal',
    })),
    ...loads.map((l) => ({
      id: l.id,
      name: l.name,
      type: 'load' as const,
      capacity: `${Math.round(l.curDemandMW)} MW (Tier ${l.priorityTier})`,
      location: l.location,
      status: l.isShed ? 'shed' : 'active',
      risk: assetRiskMap[l.id]?.riskScore || 0,
      riskStatus: assetRiskMap[l.id]?.status || 'normal',
    })),
    ...generators.map((g) => ({
      id: g.id,
      name: g.name,
      type: 'generator' as const,
      capacity: `${Math.round(g.curMW)} / ${g.pMaxMW} MW`,
      location: g.location,
      status: g.status,
      risk: assetRiskMap[g.id]?.riskScore || 0,
      riskStatus: assetRiskMap[g.id]?.status || 'normal',
    })),
  ];

  const filteredTargets = allTargets.filter((t) => {
    if (targetTypeFilter !== 'all' && t.type !== targetTypeFilter) return false;
    return true;
  });

  const currentAttackObj = ATTACK_TYPES.find((a) => a.id === selectedAttack) || ATTACK_TYPES[0];
  const currentTargetObj = allTargets.find((t) => t.id === selectedTargetId) || allTargets[0];

  const handleLaunch = async () => {
    setIsExecuting(true);
    setLastExecutionResult(null);
    try {
      // 1. Trigger the attack in the CyberQuant backend engine
      const res = await launchCustomAttack({
        attackType: selectedAttack,
        targetAssetId: selectedTargetId,
        intensity: currentAttackObj.severity === 'emergency' ? 'critical' : 'high',
        description: `${currentAttackObj.name} deployed: ${currentAttackObj.defaultDesc}`,
      });

      // 2. Automatically sync 3D focus to target asset
      selectGridAsset({ type: currentTargetObj.type, id: currentTargetObj.id });

      setLastExecutionResult({
        success: true,
        alert: res?.alert,
        financial: res?.financial,
        time: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setLastExecutionResult({
        success: false,
        error: err.message || 'Transmission failed',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#040812] text-slate-100 font-sans p-4 gap-4 select-none">
      {/* Top Banner: Engine Telemetry & Financial Pulse */}
      <div className="bg-[#070e1b] border border-[#1e293b] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            <Crosshair className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-wide font-mono uppercase">
                Adversary Attack Simulation Engine
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/50">
                OFFENSIVE OT/SCADA SUITE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an adversarial vector and target substation, load center, or generation plant to simulate cascading grid collapse and actuarial financial exposure.
            </p>
          </div>
        </div>

        {/* Real-time Financial Exposure Snapshot & Global Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-[#0a1324] px-4 py-2 rounded-lg border border-[#1e293b] font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Live Total Exposure</div>
              <div className="text-sm font-bold text-rose-400">
                ₹{(financialSummary.totalFinancialExposure / 10000000).toFixed(2)} Cr
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Active Risk Alerts</div>
              <div className="text-sm font-bold text-amber-400 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-400" /> {alerts.length}
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              const resetGrid = useGridStore.getState().resetGrid;
              resetGrid();
              const resetAll = useCyberStore.getState().resetAllGridAndAttacks;
              await resetAll();
              setLastExecutionResult(null);
            }}
            title="Reset all attacks, alert flags, and restore grid back to normal"
            className="px-3.5 py-2.5 rounded-lg bg-[#0c162a] border border-cyan-500/40 hover:bg-cyan-950/40 text-cyan-300 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>RESET ALL ATTACKS</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Attack Vector Selector (Left) + Target Selection & Ingress Launch (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* LEFT COLUMN: Attack Vector Selection (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 bg-[#070e1b] border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-200">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>STEP 1: SELECT ATTACK VECTOR</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">4 Vectors Configured</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 mt-1">
            {ATTACK_TYPES.map((attack) => {
              const Icon = attack.icon;
              const isSelected = selectedAttack === attack.id;
              return (
                <div
                  key={attack.id}
                  onClick={() => setSelectedAttack(attack.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-2 relative ${
                    isSelected
                      ? `bg-gradient-to-r ${attack.color} ${attack.borderColor} ${attack.glowColor}`
                      : 'bg-[#091120] border-[#1e293b] hover:bg-[#0c162a] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-md ${isSelected ? 'bg-black/40 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs tracking-wide">{attack.name}</div>
                        <div className="text-[10.5px] text-slate-400 font-mono">{attack.category}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-300/90 leading-relaxed font-sans pl-1">
                    {attack.defaultDesc}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-700/50 pt-2 text-slate-400">
                    <span>Protocol: {attack.protocolVector.split('/')[0]}</span>
                    <span className="uppercase text-amber-400/90 font-bold">{attack.severity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Target Substation / Load Selection & Attack Execution (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-[#070e1b] border border-[#1e293b] rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between border-b border-[#1e293b] pb-2 gap-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-200">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>STEP 2: TARGET SUBSTATION / LOAD CENTER / PLANT</span>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1 bg-[#050b14] p-1 rounded-md border border-[#1e293b] text-[11px] font-mono">
              {(['all', 'substation', 'load', 'generator'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTargetTypeFilter(cat)}
                  className={`px-2 py-0.5 rounded uppercase font-semibold transition-all ${
                    targetTypeFilter === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Assets' : cat + 's'}
                </button>
              ))}
            </div>
          </div>

          {/* Grid List of Available Substations & Loads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {filteredTargets.map((target) => {
              const isSelected = selectedTargetId === target.id;
              const isCompromised = target.riskStatus === 'compromised';
              const isSuspicious = target.riskStatus === 'suspicious';

              return (
                <div
                  key={target.id}
                  onClick={() => setSelectedTargetId(target.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                      : 'bg-[#091120] border-[#1e293b] hover:bg-[#0c162a]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {target.type === 'substation' && <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      {target.type === 'load' && <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {target.type === 'generator' && <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      <span className="font-bold text-xs text-slate-200 truncate">{target.name}</span>
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1 shadow-[0_0_6px_#00f0ff]" />}
                  </div>

                  <div className="text-[10.5px] text-slate-400 truncate font-mono">
                    {target.location}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-800">
                    <span className="text-slate-300">{target.capacity}</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                      isCompromised 
                        ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse'
                        : isSuspicious
                        ? 'bg-amber-950 text-amber-300 border border-amber-500'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    }`}>
                      {isCompromised ? 'COMPROMISED' : isSuspicious ? 'SUSPICIOUS' : 'NORMAL'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Execution Payload Box */}
          <div className="mt-auto bg-[#050b14] border border-[#1e293b] rounded-lg p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Target Ready:</span>
              <span className="text-cyan-400 font-bold">{currentTargetObj.name} ({currentTargetObj.id})</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Vector Selected:</span>
              <span className="text-rose-400 font-bold">{currentAttackObj.name}</span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                disabled={isExecuting}
                onClick={handleLaunch}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-mono font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Transmitting Cyber Vector...</span>
                  </>
                ) : (
                  <>
                    <Skull className="w-4 h-4 text-white" />
                    <span>EXECUTE CYBER ATTACK ON TARGET</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (window.opener) {
                    window.opener.focus();
                  } else {
                    window.open(`${window.location.origin}/#grid`, '_blank');
                  }
                }}
                className="px-4 py-2.5 rounded-lg bg-[#0c162a] border border-[#1e293b] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="View in main CyberQuant 3D Grid tab"
              >
                <span>OPEN 3D GRID TAB</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Attack Feedback Banner */}
            {lastExecutionResult && (
              <div className={`p-3 rounded-lg border text-xs font-mono mt-1 ${
                lastExecutionResult.success 
                  ? 'bg-rose-950/40 border-rose-500/70 text-rose-200'
                  : 'bg-red-950/60 border-red-500 text-red-200'
              }`}>
                {lastExecutionResult.success ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between font-bold text-rose-300">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-rose-400" />
                        ATTACK EXECUTED • {lastExecutionResult.alert?.attackType?.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">{lastExecutionResult.time}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Target <span className="text-cyan-300 font-semibold">{currentTargetObj.name}</span> risk escalated to <span className="text-rose-400 font-bold">{lastExecutionResult.alert?.riskScore}/100</span>.
                    </div>
                    {lastExecutionResult.financial && (
                      <div className="flex items-center justify-between pt-1 border-t border-rose-900/60 text-[11px]">
                        <span>Projected Loss: ₹{(lastExecutionResult.financial.totalEstimatedLoss / 10000000).toFixed(2)} Cr</span>
                        <span className="text-cyan-400 font-mono text-[10px]">
                          Synchronized to Grid & Risk Alerts
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>Error triggering attack: {lastExecutionResult.error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
