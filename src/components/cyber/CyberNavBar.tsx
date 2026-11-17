import React from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { 
  ShieldAlert, 
  Terminal, 
  DollarSign, 
  BarChart3, 
  Bot, 
  Grid,
  Zap,
  Radio
} from 'lucide-react';

export const CyberNavBar: React.FC = () => {
  const activeNavTab = useCyberStore((s) => s.activeNavTab);
  const setNavTab = useCyberStore((s) => s.setNavTab);
  const alerts = useCyberStore((s) => s.alerts);
  const unackAlerts = alerts.filter((a) => !a.isAcknowledged).length;
  const isConnected = useCyberStore((s) => s.isConnected);
  const triggerTestAttack = useCyberStore((s) => s.triggerTestAttack);

  return (
    <div className="bg-[#070e1b] border-b border-[#1e293b] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 bg-[#050b14] p-1 rounded-lg border border-[#1e293b]">
        <button
          onClick={() => setNavTab('grid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
            activeNavTab === 'grid'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>GRID ATLAS</span>
        </button>

        <button
          onClick={() => setNavTab('detection')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
            activeNavTab === 'detection'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>EVENT TELEMETRY</span>
        </button>

        <button
          onClick={() => setNavTab('alerts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all relative ${
            activeNavTab === 'alerts'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>RISK ALERTS</span>
          {unackAlerts > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold ml-1">
              {unackAlerts}
            </span>
          )}
        </button>

        <button
          onClick={() => setNavTab('financial')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
            activeNavTab === 'financial'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>FINANCIAL IMPACT</span>
        </button>

        <button
          onClick={() => setNavTab('analytics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
            activeNavTab === 'analytics'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_10px_rgba(129,140,248,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
          <span>LOSS ANALYTICS</span>
        </button>

        <button
          onClick={() => setNavTab('ai')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
            activeNavTab === 'ai'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-amber-400" />
          <span>AI INTEL ASSISTANT</span>
        </button>
      </div>

      {/* Simulated Strike Quick Trigger & Backend Status */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0c1527] border border-[#1e293b]">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-[11px] text-slate-400">
            {isConnected ? 'OT-SOC LINK: LIVE' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Quick Strike Simulator Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 uppercase mr-1">Inject:</span>
          <button
            onClick={() => triggerTestAttack('kaiga-scada')}
            className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-semibold transition-colors"
          >
            Kaiga SCADA
          </button>
          <button
            onClick={() => triggerTestAttack('sharavathi-trip')}
            className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[10px] font-semibold transition-colors"
          >
            Sharavathi Trip
          </button>
          <button
            onClick={() => triggerTestAttack('nelamangala-switch')}
            className="px-2 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[10px] font-semibold transition-colors"
          >
            400kV Breaker
          </button>
        </div>
      </div>
    </div>
  );
};
