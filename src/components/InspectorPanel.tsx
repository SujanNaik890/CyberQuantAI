import React, { useRef, useEffect } from 'react';
import { useGridStore } from '../store/gridStore';
import { 
  Activity, 
  Sliders, 
  FileText,
  Power,
  Gauge,
  Thermometer,
  Waves,
  Sun,
  Wind
} from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const selectedAsset = useGridStore((s) => s.selectedAsset);
  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);
  const lines = useGridStore((s) => s.lines);
  const frequencyHistory = useGridStore((s) => s.frequencyHistory);
  const telemetry = useGridStore((s) => s.telemetry);
  const eventLogs = useGridStore((s) => s.eventLogs);

  const toggleGenStatus = useGridStore((s) => s.toggleGenStatus);
  const setGenTargetMW = useGridStore((s) => s.setGenTargetMW);
  const toggleLineTrip = useGridStore((s) => s.toggleLineTrip);
  const toggleLoadShed = useGridStore((s) => s.toggleLoadShed);

  const oscCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic Oscilloscope Render
  useEffect(() => {
    const canvas = oscCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const nominal = telemetry.nominalFreqHz;
    const maxDeviation = 1.5;

    ctx.beginPath();
    const step = width / (frequencyHistory.length - 1);

    frequencyHistory.forEach((freq, idx) => {
      const dev = freq - nominal;
      const normY = (height / 2) - (dev / maxDeviation) * (height / 2 * 0.85);
      const x = idx * step;
      if (idx === 0) {
        ctx.moveTo(x, normY);
      } else {
        ctx.lineTo(x, normY);
      }
    });

    const currentFreq = telemetry.frequencyHz;
    const isCrit = Math.abs(currentFreq - nominal) > 1.0;
    const isWarn = Math.abs(currentFreq - nominal) > 0.3;

    ctx.strokeStyle = isCrit ? '#f43f5e' : isWarn ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, isCrit ? 'rgba(244, 63, 94, 0.25)' : 'rgba(56, 189, 248, 0.2)');
    grad.addColorStop(1, 'rgba(5, 11, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }, [frequencyHistory, telemetry]);

  const currentGen = selectedAsset?.type === 'generator' ? generators.find(g => g.id === selectedAsset.id) : null;
  const currentSub = selectedAsset?.type === 'substation' ? substations.find(s => s.id === selectedAsset.id) : null;
  const currentLoad = selectedAsset?.type === 'load' ? loads.find(l => l.id === selectedAsset.id) : null;
  const currentLine = selectedAsset?.type === 'line' ? lines.find(l => l.id === selectedAsset.id) : null;

  const getSimIcon = (type: string) => {
    switch (type) {
      case 'nuclear': return <Thermometer className="w-4 h-4 text-cyan-400" />;
      case 'hydro': return <Waves className="w-4 h-4 text-cyan-300" />;
      case 'solar_pv': return <Sun className="w-4 h-4 text-amber-400" />;
      case 'wind': return <Wind className="w-4 h-4 text-emerald-400" />;
      default: return <Gauge className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <aside className="w-80 xl:w-96 bg-[#070e1b] border-l border-[#1e293b] flex flex-col h-[calc(100vh-4rem)] z-10 select-none overflow-hidden">
      {/* 1. Oscilloscope Panel */}
      <div className="p-3.5 border-b border-[#1e293b] bg-[#0a1224]/60">
        <div className="flex items-center justify-between mb-1.5 font-mono">
          <span className="text-xs uppercase font-semibold text-cyan-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Frequency Oscilloscope
          </span>
          <span className="text-[11px] text-slate-400">
            {telemetry.frequencyHz.toFixed(3)} Hz
          </span>
        </div>
        <div className="relative h-20 bg-[#050b14] rounded-lg border border-[#1e293b] overflow-hidden">
          <canvas ref={oscCanvasRef} className="w-full h-full block" />
          <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">
            +{telemetry.nominalFreqHz + 1.5} Hz
          </div>
          <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500">
            -{telemetry.nominalFreqHz - 1.5} Hz
          </div>
          <div className="absolute top-1/2 right-2 -translate-y-1/2 text-[9px] font-mono text-cyan-500/70">
            NOMINAL {telemetry.nominalFreqHz.toFixed(1)} Hz
          </div>
        </div>
      </div>

      {/* 2. Station Inspector Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="border-b border-[#1e293b] pb-2 flex items-center justify-between font-mono">
          <span className="text-xs uppercase font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Plant 3D Inspector
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
            {selectedAsset?.type || 'No selection'}
          </span>
        </div>

        {/* Generator Inspector with dedicated Simulation Metrics */}
        {currentGen && (
          <div className="space-y-3 font-mono">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {getSimIcon(currentGen.type)} {currentGen.name}
              </h3>
              <p className="text-xs text-cyan-400">{currentGen.id} • {currentGen.voltageRating} kV Bus • {currentGen.type.toUpperCase()}</p>
            </div>

            {/* Specialized Dynamic Simulation Metrics */}
            <div className="p-2.5 rounded-lg bg-[#0c1527] border border-cyan-500/30 space-y-2">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Live Generation Physics
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">{currentGen.simMetrics.primaryParamName}</span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {currentGen.simMetrics.primaryParamValue.toFixed(1)} {currentGen.simMetrics.primaryParamUnit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{currentGen.simMetrics.secondaryParamName}</span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {currentGen.simMetrics.secondaryParamValue.toFixed(1)} {currentGen.simMetrics.secondaryParamUnit}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Current Output</span>
                <span className="text-slate-100 font-bold text-sm">
                  {Math.round(currentGen.curMW)} MW
                </span>
              </div>
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Rated Range</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentGen.pMinMW} - {currentGen.pMaxMW} MW
                </span>
              </div>
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Ramp Capability</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentGen.rampRateMW_s} MW/s
                </span>
              </div>
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Marginal Cost</span>
                <span className="text-slate-100 font-bold text-sm">
                  ${currentGen.marginalCost_MWh}/MWh
                </span>
              </div>
            </div>

            {/* Setpoint Slider */}
            <div className="p-3 bg-[#0c1527] border border-[#1e293b] rounded-lg space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Target Generation Setpoint:</span>
                <span className="text-cyan-400 font-bold">{Math.round(currentGen.targetMW)} MW</span>
              </div>
              <input
                type="range"
                min={currentGen.pMinMW}
                max={currentGen.pMaxMW}
                step={10}
                value={currentGen.targetMW}
                disabled={currentGen.status !== 'online' || telemetry.agcActive}
                onChange={(e) => setGenTargetMW(currentGen.id, parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer disabled:opacity-40"
              />
              {telemetry.agcActive && (
                <p className="text-[10px] text-amber-400/80">
                  * Setpoint controlled automatically by Area Control Error (AGC active).
                </p>
              )}
            </div>

            <button
              onClick={() => toggleGenStatus(currentGen.id)}
              className={`w-full py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                currentGen.status === 'online'
                  ? 'bg-rose-950/60 border border-rose-500 text-rose-300 hover:bg-rose-900'
                  : 'bg-emerald-950/60 border border-emerald-500 text-emerald-300 hover:bg-emerald-900'
              }`}
            >
              <Power className="w-4 h-4" />
              {currentGen.status === 'online' ? 'TRIP TURBINE / PLANT OFFLINE' : 'SYNCHRONIZE TO GRID'}
            </button>
          </div>
        )}

        {/* Substation Inspector */}
        {currentSub && (
          <div className="space-y-3 font-mono">
            <div>
              <h3 className="text-sm font-bold text-slate-100">{currentSub.name}</h3>
              <p className="text-xs text-indigo-400">{currentSub.id} • Voltage Intertie</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">High Voltage</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentSub.highVoltageKV} kV
                </span>
              </div>
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Low Voltage</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentSub.lowVoltageKV} kV
                </span>
              </div>
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Throughput</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentSub.activeThroughputMW} MW
                </span>
              </div>
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Bus Phase Angle (θ)</span>
                <span className="text-indigo-400 font-bold text-sm">
                  {(currentSub.voltageAngleRad * (180 / Math.PI)).toFixed(2)}°
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Load Center Inspector */}
        {currentLoad && (
          <div className="space-y-3 font-mono">
            <div>
              <h3 className="text-sm font-bold text-slate-100">{currentLoad.name}</h3>
              <p className="text-xs text-amber-400">{currentLoad.id} • Tier {currentLoad.priorityTier}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Active Demand</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentLoad.isShed ? '0 MW' : `${Math.round(currentLoad.curDemandMW)} MW`}
                </span>
              </div>
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Base Demand</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentLoad.baseDemandMW} MW
                </span>
              </div>
            </div>

            <button
              onClick={() => toggleLoadShed(currentLoad.id)}
              className={`w-full py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                currentLoad.isShed
                  ? 'bg-emerald-950/60 border border-emerald-500 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-rose-950/60 border border-rose-500 text-rose-300 hover:bg-rose-900'
              }`}
            >
              <Power className="w-4 h-4" />
              {currentLoad.isShed ? 'RESTORE LOAD FEEDER' : 'MANUAL EMERGENCY LOAD SHED'}
            </button>
          </div>
        )}

        {/* Line Inspector */}
        {currentLine && (
          <div className="space-y-3 font-mono">
            <div>
              <h3 className="text-sm font-bold text-slate-100">{currentLine.name}</h3>
              <p className="text-xs text-cyan-400">{currentLine.id} • {currentLine.voltageKV} kV</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Active MW Flow</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentLine.isTripped ? '0.0 MW' : `${Math.abs(currentLine.curFlowMW).toFixed(1)} MW`}
                </span>
              </div>
              <div className="p-2 bg-[#0c1527] border border-[#1e293b] rounded">
                <span className="text-slate-500 text-[10px] block">Thermal Limit</span>
                <span className="text-slate-100 font-bold text-sm">
                  {currentLine.thermalLimitMW} MW
                </span>
              </div>
            </div>

            <button
              onClick={() => toggleLineTrip(currentLine.id)}
              className={`w-full py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                currentLine.isTripped
                  ? 'bg-emerald-950/60 border border-emerald-500 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-rose-950/60 border border-rose-500 text-rose-300 hover:bg-rose-900'
              }`}
            >
              <Power className="w-4 h-4" />
              {currentLine.isTripped ? 'RECLOSE BREAKER' : 'MANUAL TRIP BREAKER'}
            </button>
          </div>
        )}

        {/* 3. Event Dispatch Log */}
        <div className="border-t border-[#1e293b] pt-3">
          <div className="flex items-center justify-between mb-2 font-mono">
            <span className="text-xs uppercase font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" /> Event Dispatch Log
            </span>
            <span className="text-[10px] text-slate-500">Live Telemetry</span>
          </div>
          <div className="h-44 bg-[#050b14] border border-[#1e293b] rounded-lg p-2 overflow-y-auto space-y-1.5 font-mono text-[11px]">
            {eventLogs.map((log) => (
              <div
                key={log.id}
                className={`p-1.5 rounded border text-[10.5px] leading-relaxed ${
                  log.type === 'trip'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : log.type === 'alert'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                    : log.type === 'agc'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-[#0c1527] border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-slate-500 mb-0.5">
                  <span>[{log.timestamp}]</span>
                  <span className="uppercase">{log.type}</span>
                </div>
                <div>{log.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
