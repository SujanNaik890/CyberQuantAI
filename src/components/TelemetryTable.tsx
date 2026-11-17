import React from 'react';
import { useGridStore } from '../store/gridStore';
import { Power, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const TelemetryTable: React.FC = () => {
  const lines = useGridStore((s) => s.lines);
  const selectedAsset = useGridStore((s) => s.selectedAsset);
  const selectAsset = useGridStore((s) => s.selectAsset);
  const toggleLineTrip = useGridStore((s) => s.toggleLineTrip);

  return (
    <div className="flex-1 bg-[#070e1b] flex flex-col min-h-0 select-none overflow-hidden">
      {/* Table Header Bar */}
      <div className="px-4 py-2 border-b border-[#1e293b] flex items-center justify-between bg-[#0a1224]/70">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase text-cyan-400 tracking-wider">
            Transmission Branch Telemetry
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {lines.length} Corridors Active
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Click row to inspect • Manual breaker trip/reclose override
        </div>
      </div>

      {/* Scrollable Telemetry Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead className="sticky top-0 bg-[#050b14] border-b border-[#1e293b] text-slate-400 text-[11px] z-10">
            <tr>
              <th className="py-2 px-3">Branch ID</th>
              <th className="py-2 px-3">Line Name</th>
              <th className="py-2 px-3">Voltage</th>
              <th className="py-2 px-3">Active Flow (MW)</th>
              <th className="py-2 px-3">Thermal Limit</th>
              <th className="py-2 px-3 min-w-[140px]">Utilization</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3 text-right">Breaker Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]/60">
            {lines.map((line) => {
              const isSelected = selectedAsset?.type === 'line' && selectedAsset.id === line.id;
              const util = Math.abs(line.curFlowMW) / line.thermalLimitMW;
              const utilPercent = Math.min(100, Math.round(util * 100));
              const isOverloaded = !line.isTripped && util > 1.0;

              return (
                <tr
                  key={line.id}
                  onClick={() => selectAsset({ type: 'line', id: line.id })}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/40 text-slate-100'
                      : isOverloaded
                      ? 'bg-rose-950/20 text-rose-200 hover:bg-rose-950/30'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  {/* Branch ID */}
                  <td className="py-2 px-3 text-cyan-400 font-bold whitespace-nowrap">
                    {line.id}
                  </td>

                  {/* Name */}
                  <td className="py-2 px-3 whitespace-nowrap font-sans text-xs">
                    {line.name}
                  </td>

                  {/* Voltage */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      line.voltageKV === 500
                        ? 'bg-cyan-950 border border-cyan-500/30 text-cyan-300'
                        : 'bg-indigo-950 border border-indigo-500/30 text-indigo-300'
                    }`}>
                      {line.voltageKV} kV
                    </span>
                  </td>

                  {/* Active MW Flow */}
                  <td className="py-2 px-3 whitespace-nowrap font-bold">
                    <span className={line.isTripped ? 'text-slate-500' : isOverloaded ? 'text-rose-400' : 'text-slate-100'}>
                      {line.isTripped ? '0.0 MW' : `${Math.abs(line.curFlowMW).toFixed(1)} MW`}
                    </span>
                  </td>

                  {/* Thermal Limit */}
                  <td className="py-2 px-3 whitespace-nowrap text-slate-400">
                    {line.thermalLimitMW} MW
                  </td>

                  {/* Utilization Bar */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-[90px]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            line.isTripped
                              ? 'w-0'
                              : isOverloaded
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                              : util > 0.8
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${line.isTripped ? 0 : utilPercent}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold ${
                        line.isTripped
                          ? 'text-slate-500'
                          : isOverloaded
                          ? 'text-rose-400'
                          : util > 0.8
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}>
                        {line.isTripped ? '0%' : `${utilPercent}%`}
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    {line.isTripped ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded">
                        <AlertOctagon className="w-3 h-3 text-rose-500" /> TRIPPED
                      </span>
                    ) : isOverloaded ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-950/60 border border-rose-500 px-2 py-0.5 rounded animate-pulse">
                        <AlertOctagon className="w-3 h-3 text-rose-400" /> OVERLOAD ({line.overloadDuration_s.toFixed(1)}s)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> NORMAL
                      </span>
                    )}
                  </td>

                  {/* Breaker Action Button */}
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLineTrip(line.id);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ml-auto ${
                        line.isTripped
                          ? 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300'
                          : 'bg-rose-950/50 hover:bg-rose-900 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {line.isTripped ? 'RECLOSE' : 'TRIP'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
