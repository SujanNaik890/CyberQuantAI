import React from 'react';
import { useGridStore } from '../store/gridStore';
import { useCyberStore } from '../store/cyberStore';
import { NotificationBell } from './cyber/NotificationBell';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  RotateCcw, 
  Play, 
  Pause, 
  Download, 
  Flame, 
  Radio,
  Sliders,
  RefreshCw,
  ExternalLink,
  Crosshair
} from 'lucide-react';

export const TopHeader: React.FC = () => {
  const telemetry = useGridStore((s) => s.telemetry);
  const isPaused = useGridStore((s) => s.isPaused);
  const togglePause = useGridStore((s) => s.togglePause);
  const resetGrid = useGridStore((s) => s.resetGrid);
  const triggerMasterContingency = useGridStore((s) => s.triggerMasterContingency);
  const exportGridStateJSON = useGridStore((s) => s.exportGridStateJSON);
  const setNominalFreq = useGridStore((s) => s.setNominalFreq);
  const resetAllGridAndAttacks = useCyberStore((s) => s.resetAllGridAndAttacks);

  const freqDiff = telemetry.frequencyHz - telemetry.nominalFreqHz;
  const isFreqCrit = Math.abs(freqDiff) > 1.2;
  const isFreqWarn = Math.abs(freqDiff) > 0.4;

  const handleFullReset = async () => {
    // 1. Reset powerflow grid physics, transmission lines, generators & loads
    resetGrid();
    // 2. Clear backend database & reset cyber attacks, alerts, risk highlights & financial loss counters
    await resetAllGridAndAttacks();
  };

  const handleExport = () => {
    const jsonStr = exportGridStateJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CyberQuant_Telemetry_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDedicatedAttackConsole = () => {
    const attackUrl = `${window.location.origin}/#attacks`;
    window.open(attackUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="h-16 bg-[#070e1b] border-b border-[#1e293b] px-4 flex items-center justify-between z-20 select-none shadow-lg">
      {/* Brand & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded bg-[#0c1527] border border-cyan-500/30 text-cyan-400">
            <Zap className="w-5 h-5 fill-cyan-400/20 text-cyan-400 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-wider text-base text-slate-100 flex items-center gap-1.5">
                CYBER<span className="text-cyan-400">QUANT</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                EMS-SYNOPTIC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">DC Power Flow • Real-Time Inertia</p>
          </div>
        </div>

        {/* Nominal Frequency Selector Toggle */}
        <div className="hidden lg:flex items-center bg-[#050b14] p-1 rounded border border-[#1e293b] text-xs font-mono ml-3">
          <button
            onClick={() => setNominalFreq(50.00)}
            className={`px-2.5 py-1 rounded transition-colors ${
              telemetry.nominalFreqHz === 50
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            50 Hz Standard
          </button>
          <button
            onClick={() => setNominalFreq(60.00)}
            className={`px-2.5 py-1 rounded transition-colors ${
              telemetry.nominalFreqHz === 60
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            60 Hz N.America
          </button>
        </div>
      </div>

      {/* Primary Telemetry Readout Dials (Top Cockpit) */}
      <div className="flex items-center gap-3 xl:gap-5 font-mono">
        {/* Dynamic Grid Frequency Readout */}
        <div className={`flex items-center gap-3 px-3.5 py-1.5 rounded-md border transition-all ${
          isFreqCrit 
            ? 'bg-rose-950/40 border-rose-500 text-rose-300 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
            : isFreqWarn
            ? 'bg-amber-950/30 border-amber-500/50 text-amber-300'
            : 'bg-[#0c1527] border-[#1e293b] text-emerald-400'
        }`}>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400 tracking-wider uppercase flex items-center justify-end gap-1">
              <Activity className="w-3 h-3 text-cyan-400" /> System Freq
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tracking-tight">
                {telemetry.frequencyHz.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">Hz</span>
            </div>
          </div>
          <div className="text-[10px] px-1.5 py-0.5 rounded bg-[#050b14] border border-[#1e293b]">
            <span className={freqDiff > 0.05 ? 'text-cyan-400' : freqDiff < -0.05 ? 'text-rose-400' : 'text-slate-400'}>
              {freqDiff >= 0 ? `+${freqDiff.toFixed(2)}` : freqDiff.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Total Generation */}
        <div className="hidden sm:flex flex-col px-3 py-1.5 rounded-md bg-[#0c1527] border border-[#1e293b]">
          <span className="text-[10px] text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Total Gen
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-100">
              {telemetry.totalGenMW.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">MW</span>
          </div>
        </div>

        {/* Total Demand */}
        <div className="hidden sm:flex flex-col px-3 py-1.5 rounded-md bg-[#0c1527] border border-[#1e293b]">
          <span className="text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Total Load
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-100">
              {telemetry.totalDemandMW.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">MW</span>
          </div>
        </div>

        {/* Net Losses */}
        <div className="hidden md:flex flex-col px-3 py-1.5 rounded-md bg-[#0c1527] border border-[#1e293b]">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            I²R Loss
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-300">
              {telemetry.netLossesMW.toFixed(1)}
            </span>
            <span className="text-[11px] text-slate-500">MW</span>
          </div>
        </div>

        {/* AGC Mode Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0c1527] border border-[#1e293b]">
          <Radio className={`w-3.5 h-3.5 ${telemetry.agcActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="text-xs text-slate-300">
            {telemetry.agcActive ? 'AGC AUTO' : 'MANUAL'}
          </span>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-2">
        {/* Launch Dedicated Attack Console in Separate Window */}
        <button
          onClick={openDedicatedAttackConsole}
          title="Open Dedicated Adversary Attack Engine in a Separate Window"
          className="px-2.5 py-1.5 rounded bg-red-950/40 border border-red-500/50 text-red-300 hover:bg-red-900/50 hover:text-red-200 transition-all flex items-center gap-1.5 font-mono text-xs shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]"
        >
          <Crosshair className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="font-semibold">ATTACK CONSOLE ↗</span>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePause}
          title={isPaused ? "Resume Simulation" : "Pause Simulation"}
          className={`p-2 rounded border transition-colors ${
            isPaused
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
              : 'bg-[#0c1527] border-[#1e293b] text-slate-300 hover:bg-slate-800'
          }`}
        >
          {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Reset System */}
        <button
          onClick={handleFullReset}
          title="Reset Grid & Cyber Attacks to Normal Baseline"
          className="px-3 py-1.5 rounded bg-[#0c1527] border border-[#1e293b] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 font-mono text-xs shadow-sm hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline font-semibold">RESET GRID</span>
        </button>

        {/* Export JSON Telemetry */}
        <button
          onClick={handleExport}
          title="Export Telemetry Snapshot (JSON)"
          className="p-2 rounded bg-[#0c1527] border border-[#1e293b] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors hidden sm:block"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Cyber Threat Notification Bell */}
        <NotificationBell />
      </div>
    </header>
  );
};
