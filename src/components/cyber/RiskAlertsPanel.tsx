import React, { useState } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  Search, 
  Clock, 
  Radio, 
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { RiskCategory, AlertSeverity } from '../../engine/cyberModels';

export const RiskAlertsPanel: React.FC = () => {
  const alerts = useCyberStore((s) => s.alerts);
  const incidents = useCyberStore((s) => s.incidents);
  const acknowledgeAlert = useCyberStore((s) => s.acknowledgeAlert);
  const selectIncident = useCyberStore((s) => s.selectIncident);
  const setNavTab = useCyberStore((s) => s.setNavTab);

  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  const selectedAlert = alerts.find((a) => a.alertId === selectedAlertId) || filteredAlerts[0];
  const linkedIncident = selectedAlert ? incidents.find((i) => i.alertId === selectedAlert.alertId) : null;

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'emergency':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500 animate-pulse">EMERGENCY</span>;
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/60">CRITICAL</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/60">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/60">INFO</span>;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 75) return 'text-rose-400 border-rose-500 bg-rose-950/40';
    if (score >= 50) return 'text-orange-400 border-orange-500 bg-orange-950/40';
    if (score >= 25) return 'text-amber-400 border-amber-500 bg-amber-950/40';
    return 'text-emerald-400 border-emerald-500 bg-emerald-950/40';
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#050b14] font-mono text-xs select-none">
      {/* Alert Feed Column */}
      <div className="flex-1 flex flex-col border-r border-[#1e293b] min-w-0">
        <div className="p-3 border-b border-[#1e293b] bg-[#070e1b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-slate-200">Active Operational Risk Alerts</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40">
              {filteredAlerts.length} Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-[#0c1527] border border-[#1e293b] rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Severities</option>
              <option value="emergency">Emergency Only</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
            </select>
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]/60">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-10 h-10 text-emerald-400/60 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">All grid assets operational.</p>
              <p className="text-xs mt-1">No unacknowledged cybersecurity breaches in progress.</p>
            </div>
          ) : (
            filteredAlerts.map((a) => {
              const isSelected = selectedAlert?.alertId === a.alertId;
              return (
                <div
                  key={a.alertId}
                  onClick={() => setSelectedAlertId(a.alertId)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-rose-950/25 border-l-4 border-rose-500'
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(a.severity)}
                      <span className="font-bold text-slate-200">{a.targetAssetName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded border font-bold text-xs ${getRiskScoreColor(a.riskScore)}`}>
                        RISK {a.riskScore}/100
                      </div>
                      {a.isAcknowledged && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> ACK
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span>Attack: <strong className="text-cyan-300">{a.attackType.replace(/_/g, ' ').toUpperCase()}</strong></span>
                    <span>Source: <strong className="text-rose-400">{a.sourceIP}</strong></span>
                    <span>Affected: <strong className="text-amber-400">{Math.round(a.affectedGenerationMW)} MW</strong></span>
                  </div>

                  <div className="text-slate-300 text-xs mt-1 line-clamp-2">
                    {a.recommendedAction}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Alert Deep Dive Dossier */}
      <div className="w-full md:w-[440px] lg:w-[480px] bg-[#070e1b] flex flex-col overflow-y-auto p-4 space-y-4">
        {selectedAlert ? (
          <>
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-400 uppercase tracking-wider">Incident Response Card</span>
                  {getSeverityBadge(selectedAlert.severity)}
                </div>
                <h2 className="text-sm font-bold text-slate-100 mt-1">{selectedAlert.alertId}</h2>
              </div>

              {!selectedAlert.isAcknowledged ? (
                <button
                  onClick={() => acknowledgeAlert(selectedAlert.alertId)}
                  className="px-3 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                >
                  <ShieldCheck className="w-4 h-4" /> Acknowledge Alert
                </button>
              ) : (
                <div className="text-emerald-400 font-bold text-xs flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/30">
                  <CheckCircle className="w-3.5 h-3.5" /> Acknowledged by Operator
                </div>
              )}
            </div>

            {/* Score & Asset Snapshot */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border flex flex-col justify-between ${getRiskScoreColor(selectedAlert.riskScore)}`}>
                <span className="text-[10px] uppercase font-semibold">Calculated Cyber Risk</span>
                <div className="text-3xl font-extrabold my-1">{selectedAlert.riskScore}<span className="text-xs">/100</span></div>
                <span className="text-[10px] uppercase font-bold tracking-wider">{selectedAlert.riskCategory} SEVERITY</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0c1527] border border-[#1e293b] flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase">Affected Active Capacity</span>
                <div className="text-2xl font-bold text-amber-400 my-1">{Math.round(selectedAlert.affectedGenerationMW)} <span className="text-xs text-slate-400">MW</span></div>
                <span className="text-[10px] text-slate-400">Target: {selectedAlert.targetAssetId}</span>
              </div>
            </div>

            {/* Grid Impact */}
            <div className="p-3 rounded-lg bg-[#0c1527] border border-[#1e293b] space-y-1">
              <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" /> Operational Grid Impact Assessment
              </div>
              <div className="text-xs text-slate-200 leading-relaxed font-sans">{selectedAlert.currentGridImpact}</div>
            </div>

            {/* Recommended Action */}
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/40 space-y-1">
              <div className="text-[10px] text-cyan-300 uppercase font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Recommended Operator Action
              </div>
              <div className="text-xs text-slate-100 leading-relaxed font-sans">{selectedAlert.recommendedAction}</div>
            </div>

            {/* Explainable Risk Computation */}
            <div className="p-3 rounded-lg bg-[#0c1527] border border-[#1e293b] space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">Explainable Risk Calculation Engine</div>
              <div className="text-[11px] text-slate-300 leading-relaxed font-sans">{selectedAlert.explanation}</div>
            </div>

            {/* Jump to Financial Analysis */}
            {linkedIncident && (
              <div className="p-3 rounded-lg bg-[#0a1428] border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">Financial Exposure Calculated</div>
                  <div className="text-base font-extrabold text-slate-100">
                    ₹{(linkedIncident.totalEstimatedLoss / 100000).toFixed(2)} Lakhs
                  </div>
                </div>
                <button
                  onClick={() => {
                    selectIncident(linkedIncident);
                    setNavTab('financial');
                  }}
                  className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  View Loss Breakdown <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-slate-500">
            Select an alert to inspect incident details.
          </div>
        )}
      </div>
    </div>
  );
};
