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
  Radio,
  Crosshair
} from 'lucide-react';

export const CyberNavBar: React.FC = () => {
  const activeNavTab = useCyberStore((s) => s.activeNavTab);
  const setNavTab = useCyberStore((s) => s.setNavTab);
  const alerts = useCyberStore((s) => s.alerts);
  const unackAlerts = alerts.filter((a) => !a.isAcknowledged).length;
  const isConnected = useCyberStore((s) => s.isConnected);

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
          <span>CYBER QUANT GRID</span>
        </button>

        <button
          onClick={() => setNavTab('attacks')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
            activeNavTab === 'attacks'
              ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
              : 'text-slate-400 hover:text-red-300'
          }`}
          title="Direct link: /#attacks"
        >
          <Crosshair className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="font-bold">ATTACK ENGINE</span>
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

      {/* Backend Link Status */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0c1527] border border-[#1e293b]">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-[11px] text-slate-400">
            {isConnected ? 'OT-SOC LINK: LIVE' : 'DISCONNECTED'}
          </span>
        </div>
      </div>
    </div>
  );
};
