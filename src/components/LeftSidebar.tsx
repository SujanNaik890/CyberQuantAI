import React from 'react';
import { useGridStore } from '../store/gridStore';
import { 
  Cpu, 
  Flame, 
  Sun, 
  Wind, 
  Waves, 
  Radio, 
  Layers, 
  Factory, 
  Building2, 
  Ship, 
  Sliders, 
  Power,
  TrendingUp,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { GeneratorType, LoadType } from '../engine/gridModel';

export const LeftSidebar: React.FC = () => {
  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);
  const telemetry = useGridStore((s) => s.telemetry);
  const selectedAsset = useGridStore((s) => s.selectedAsset);
  const selectAsset = useGridStore((s) => s.selectAsset);
  const toggleGenStatus = useGridStore((s) => s.toggleGenStatus);
  const toggleLoadShed = useGridStore((s) => s.toggleLoadShed);
  const toggleAGC = useGridStore((s) => s.toggleAGC);
  const setBaseDemandScale = useGridStore((s) => s.setBaseDemandScale);

  const getGenIcon = (type: GeneratorType) => {
    switch (type) {
      case 'nuclear': return <Cpu className="w-3.5 h-3.5 text-cyan-400" />;
      case 'hydro': return <Waves className="w-3.5 h-3.5 text-cyan-300" />;
      case 'thermal_gas': return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'wind': return <Wind className="w-3.5 h-3.5 text-emerald-400" />;
      case 'solar_pv': return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getLoadIcon = (type: LoadType) => {
    switch (type) {
      case 'industrial': return <Factory className="w-3.5 h-3.5 text-amber-400" />;
      case 'residential': return <Building2 className="w-3.5 h-3.5 text-sky-400" />;
      case 'commercial': return <Ship className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <aside className="w-72 xl:w-80 bg-[#070e1b] border-r border-[#1e293b] flex flex-col h-[calc(100vh-4rem)] z-10 select-none overflow-hidden">
      {/* Dispatch Controls & AGC Banner */}
      <div className="p-3.5 border-b border-[#1e293b] space-y-3 bg-[#0a1224]/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" /> AGC Governor Dispatch
          </span>
          <button
            onClick={toggleAGC}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              telemetry.agcActive
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {telemetry.agcActive ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {telemetry.agcActive ? 'AGC AUTO' : 'MANUAL'}
          </button>
        </div>

        {/* Global Base Demand Scaler */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="text-slate-400">Demand Stress Scaling:</span>
            <span className="text-amber-400 font-bold">
              {Math.round(telemetry.baseDemandScale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={telemetry.baseDemandScale}
            onChange={(e) => setBaseDemandScale(parseFloat(e.target.value))}
            className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>50% (Off-Peak)</span>
            <span>100% (Nominal)</span>
            <span>150% (Extreme Peak)</span>
          </div>
        </div>
      </div>

      {/* Asset Explorer List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Power Generation Fleet */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono uppercase text-cyan-400 tracking-wider mb-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Supply Fleet ({generators.length})
            </span>
            <span className="text-[11px] text-slate-400">
              {Math.round(generators.reduce((sum, g) => sum + (g.status === 'online' ? g.curMW : 0), 0))} MW
            </span>
          </div>
          <div className="space-y-1.5">
            {generators.map((gen) => {
              const isSelected = selectedAsset?.type === 'generator' && selectedAsset.id === gen.id;
              const isOnline = gen.status === 'online';
              const capRatio = isOnline ? (gen.curMW / gen.pMaxMW) * 100 : 0;

              return (
                <div
                  key={gen.id}
                  onClick={() => selectAsset({ type: 'generator', id: gen.id })}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                      : 'bg-[#0c1527] border-[#1e293b] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div className="p-1 rounded bg-slate-900 border border-slate-800">
                        {getGenIcon(gen.type)}
                      </div>
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {gen.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGenStatus(gen.id);
                      }}
                      title={isOnline ? "Trip offline" : "Synchronize to grid"}
                      className={`p-1 rounded transition-colors ${
                        isOnline
                          ? 'text-emerald-400 hover:text-rose-400 hover:bg-rose-950/30'
                          : 'text-rose-500 hover:text-emerald-400 hover:bg-emerald-950/30'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {isOnline ? `${Math.round(gen.curMW)} / ${gen.pMaxMW} MW` : 'OFFLINE (TRIPPED)'}
                    </span>
                    <span className={isOnline ? 'text-cyan-400' : 'text-rose-400'}>
                      {isOnline ? `${Math.round(capRatio)}%` : '0%'}
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        !isOnline
                          ? 'w-0'
                          : capRatio > 90
                          ? 'bg-rose-500'
                          : capRatio > 70
                          ? 'bg-cyan-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, capRatio)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Substations & Voltage Hubs */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono uppercase text-indigo-400 tracking-wider mb-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Substations ({substations.length})
            </span>
            <span className="text-[11px] text-slate-400">Hubs</span>
          </div>
          <div className="space-y-1.5">
            {substations.map((sub) => {
              const isSelected = selectedAsset?.type === 'substation' && selectedAsset.id === sub.id;
              return (
                <div
                  key={sub.id}
                  onClick={() => selectAsset({ type: 'substation', id: sub.id })}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-[0_0_12px_rgba(129,140,248,0.25)]'
                      : 'bg-[#0c1527] border-[#1e293b] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="p-1 rounded bg-slate-900 border border-slate-800">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {sub.name}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                      {sub.highVoltageKV}kV
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>Throughput: {sub.activeThroughputMW} MW</span>
                    <span className="text-emerald-400 text-[10px]">ENERGIZED</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consumer Load Centers */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono uppercase text-amber-400 tracking-wider mb-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Load Centers ({loads.length})
            </span>
            <span className="text-[11px] text-slate-400">
              {Math.round(loads.reduce((sum, l) => sum + (l.isShed ? 0 : l.curDemandMW), 0))} MW
            </span>
          </div>
          <div className="space-y-1.5">
            {loads.map((load) => {
              const isSelected = selectedAsset?.type === 'load' && selectedAsset.id === load.id;
              return (
                <div
                  key={load.id}
                  onClick={() => selectAsset({ type: 'load', id: load.id })}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-[#0c1527] border-[#1e293b] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div className="p-1 rounded bg-slate-900 border border-slate-800">
                        {getLoadIcon(load.type)}
                      </div>
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {load.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLoadShed(load.id);
                      }}
                      title={load.isShed ? "Restore Load" : "Shed Load (Brownout)"}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        load.isShed
                          ? 'bg-rose-950/60 border border-rose-500/50 text-rose-300 hover:bg-emerald-950/60 hover:text-emerald-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-rose-400'
                      }`}
                    >
                      {load.isShed ? 'SHED' : 'ONLINE'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {load.isShed ? '0 MW (SHED)' : `${Math.round(load.curDemandMW)} MW`}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Tier {load.priorityTier} {load.priorityTier === 1 ? '(Critical)' : '(Sheddable)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
