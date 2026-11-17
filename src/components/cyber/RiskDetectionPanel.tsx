import React, { useState } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { Terminal, Shield, Filter, Search, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { AttackCategory } from '../../engine/cyberModels';

export const RiskDetectionPanel: React.FC = () => {
  const events = useCyberStore((s) => s.events);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const triggerTestAttack = useCyberStore((s) => s.triggerTestAttack);

  const filteredEvents = events.filter((e) => {
    if (filterCat !== 'all' && e.attackCategory !== filterCat) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.eventId.toLowerCase().includes(q) ||
        e.sourceIP.includes(q) ||
        e.targetAssetId.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedEvent = events.find((e) => e.eventId === selectedEventId) || filteredEvents[0];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#050b14] font-mono text-xs select-none">
      {/* Left List of Ingested Telemetry Events */}
      <div className="flex-1 flex flex-col border-r border-[#1e293b] min-w-0">
        {/* Controls Bar */}
        <div className="p-3 border-b border-[#1e293b] bg-[#070e1b] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">Security Telemetry Stream</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              {filteredEvents.length} Events
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Search IP / Asset / ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0c1527] border border-[#1e293b] rounded pl-7 pr-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 w-44"
              />
            </div>

            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="bg-[#0c1527] border border-[#1e293b] rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Attack Categories</option>
              <option value="unauthorized_scada_access">SCADA Unauthorized Access</option>
              <option value="abnormal_generator_shutdown">Generator Shutdown Injection</option>
              <option value="suspicious_substation_switching">Substation Breaker Switching</option>
              <option value="repeated_auth_failure">Authentication Brute Force</option>
              <option value="unauthorized_agc_modification">AGC Parameter Tampering</option>
              <option value="transmission_line_trip">Transmission Corridor Trip</option>
            </select>
          </div>
        </div>

        {/* Events Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]/60">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Shield className="w-10 h-10 text-cyan-500/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No security telemetry events recorded.</p>
              <p className="text-xs mt-1">Use the quick trigger buttons above or run an attack simulation.</p>
            </div>
          ) : (
            filteredEvents.map((e) => {
              const isSelected = selectedEvent?.eventId === e.eventId;
              return (
                <div
                  key={e.eventId}
                  onClick={() => setSelectedEventId(e.eventId)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/30 border-l-4 border-cyan-400'
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{e.eventId}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {e.detectionSource}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 uppercase">
                        {e.attackCategory.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <div>
                      Source: <span className="text-rose-400 font-bold">{e.sourceIP}</span> &rarr; Target: <span className="text-cyan-300 font-bold">{e.targetAssetId}</span>
                    </div>
                    <div>
                      Confidence: <span className="text-amber-400 font-bold">{Math.round(e.confidenceLevel * 100)}%</span>
                    </div>
                  </div>

                  <div className="mt-1 text-slate-300 text-xs line-clamp-1">
                    {e.description}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Event Inspector & Raw Telemetry Dossier */}
      <div className="w-full md:w-96 lg:w-[420px] bg-[#070e1b] flex flex-col overflow-y-auto p-4 space-y-4">
        {selectedEvent ? (
          <>
            <div className="border-b border-[#1e293b] pb-3">
              <span className="text-[10px] text-cyan-400 uppercase tracking-wider">Security Dossier</span>
              <h2 className="text-sm font-bold text-slate-100 mt-1">{selectedEvent.eventId}</h2>
              <span className="text-[11px] text-slate-400">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#0c1527] border border-[#1e293b] space-y-2">
                <div className="text-[10px] text-slate-400 uppercase">Target Grid Node</div>
                <div className="text-xs font-bold text-cyan-300">{selectedEvent.targetAssetId}</div>
                <div className="text-[11px] text-slate-300 leading-relaxed">{selectedEvent.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-[#0c1527] border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400">Attacker Ingress IP</span>
                  <div className="text-xs font-bold text-rose-400 mt-0.5">{selectedEvent.sourceIP}</div>
                </div>
                <div className="p-2.5 rounded bg-[#0c1527] border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400">Target Internal Gateway</span>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{selectedEvent.destIP}</div>
                </div>
                <div className="p-2.5 rounded bg-[#0c1527] border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400">Classification Confidence</span>
                  <div className="text-xs font-bold text-amber-400 mt-0.5">{Math.round(selectedEvent.confidenceLevel * 100)}% Verified</div>
                </div>
                <div className="p-2.5 rounded bg-[#0c1527] border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400">Incident Status</span>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5 uppercase">{selectedEvent.attackStatus}</div>
                </div>
              </div>

              {selectedEvent.rawPayload && (
                <div className="p-3 rounded-lg bg-[#050b14] border border-[#1e293b]">
                  <div className="text-[10px] text-slate-400 uppercase mb-1">Raw Telemetry Packet Payload</div>
                  <pre className="text-[10px] text-cyan-300/80 overflow-x-auto whitespace-pre-wrap font-mono p-2 bg-[#020617] rounded border border-slate-800">
                    {selectedEvent.rawPayload}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-slate-500">
            Select an event to inspect telemetry payload details.
          </div>
        )}
      </div>
    </div>
  );
};
