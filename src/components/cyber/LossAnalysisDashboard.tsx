import React, { useRef, useEffect } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  Layers, 
  DollarSign,
  Lock
} from 'lucide-react';

export const LossAnalysisDashboard: React.FC = () => {
  const financialSummary = useCyberStore((s) => s.financialSummary);
  const incidents = useCyberStore((s) => s.incidents);

  const pieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  // Render Loss Breakdown Pie Chart
  useEffect(() => {
    const canvas = pieCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const slices = [
      { label: 'Replacement Power', value: financialSummary.totalReplacementCost || 1, color: '#38bdf8' },
      { label: 'Unserved Energy (VoLL)', value: financialSummary.totalUnservedImpact || 1, color: '#f59e0b' },
      { label: 'Recovery & Forensics', value: financialSummary.totalRecoveryCost || 1, color: '#818cf8' },
      { label: 'Operations & Penalty', value: financialSummary.totalOperationalCost || 1, color: '#f43f5e' },
    ];

    const total = slices.reduce((sum, s) => sum + s.value, 0);
    let startAngle = -Math.PI / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const innerRadius = radius * 0.55; // Donut chart

    slices.forEach((slice) => {
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.shadowColor = slice.color;
      ctx.shadowBlur = 8;
      ctx.fill();

      startAngle = endAngle;
    });

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [financialSummary]);

  // Render Asset-Wise Financial Exposure Bar Chart
  useEffect(() => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = financialSummary.assetExposure.length > 0
      ? financialSummary.assetExposure
      : [
          { assetName: 'Kaiga Nuclear', exposure: 50000000 },
          { assetName: 'Sharavathi Hydro', exposure: 35000000 },
          { assetName: 'Nelamangala 400kV', exposure: 28000000 },
          { assetName: 'Pavagada Solar', exposure: 15000000 },
        ];

    const maxVal = Math.max(...data.map((d) => d.exposure), 1);
    const barWidth = (width - 60) / data.length;
    const chartHeight = height - 40;

    data.forEach((item, idx) => {
      const barH = (item.exposure / maxVal) * (chartHeight - 20);
      const x = 30 + idx * barWidth + 10;
      const y = height - 25 - barH;
      const w = barWidth - 20;

      // Draw bar
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#0284c7');

      ctx.fillStyle = grad;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6;
      ctx.fillRect(x, y, w, barH);
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const shortName = item.assetName.split(' ')[0];
      ctx.fillText(shortName, x + w / 2, height - 10);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(formatINR(item.exposure), x + w / 2, y - 6);
    });
  }, [financialSummary]);

  // Before & After Security Controls Model
  const baselineExposure = financialSummary.totalFinancialExposure || 120000000;
  const hardenedExposure = Math.round(baselineExposure * 0.28); // 72% reduction via OT Zero Trust + Microsegmentation
  const savedExposure = baselineExposure - hardenedExposure;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#050b14] font-mono text-xs select-none space-y-6">
      {/* Top Cockpit KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0c1527] border border-cyan-500/30">
          <span className="text-[10px] text-slate-400 uppercase">Cumulative Grid Financial Exposure</span>
          <div className="text-2xl font-extrabold text-cyan-300 mt-1">
            {formatINR(financialSummary.totalFinancialExposure)}
          </div>
          <span className="text-[10px] text-slate-500">Across {financialSummary.incidentCount} modeled incidents</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1527] border border-amber-500/30">
          <span className="text-[10px] text-slate-400 uppercase">Latest Incident Impact</span>
          <div className="text-2xl font-extrabold text-amber-300 mt-1">
            {formatINR(financialSummary.currentIncidentLoss)}
          </div>
          <span className="text-[10px] text-slate-500">Most recent breach projection</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1527] border border-emerald-500/30">
          <span className="text-[10px] text-slate-400 uppercase">Total Replacement Power</span>
          <div className="text-2xl font-extrabold text-emerald-300 mt-1">
            {formatINR(financialSummary.totalReplacementCost)}
          </div>
          <span className="text-[10px] text-slate-500">Emergency market procurement</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1527] border border-rose-500/30">
          <span className="text-[10px] text-slate-400 uppercase">Forensic & OT Recovery Pool</span>
          <div className="text-2xl font-extrabold text-rose-300 mt-1">
            {formatINR(financialSummary.totalRecoveryCost + financialSummary.totalOperationalCost)}
          </div>
          <span className="text-[10px] text-slate-500">Restoration, firmware flash & regulatory</span>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Loss Breakdown */}
        <div className="p-5 rounded-xl bg-[#070e1b] border border-[#1e293b] flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-cyan-400" /> Loss Category Distribution
            </span>
            <span className="text-[10px] text-slate-400">Proportional Share</span>
          </div>

          <div className="relative my-2">
            <canvas ref={pieCanvasRef} width={260} height={260} className="max-w-full" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400">TOTAL</span>
              <span className="text-sm font-extrabold text-slate-100">{formatINR(financialSummary.totalFinancialExposure)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-3 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-slate-300">Replacement Power</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-300">Unserved Load (VoLL)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <span className="text-slate-300">Recovery & Forensics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="text-slate-300">Operations & Penalty</span>
            </div>
          </div>
        </div>

        {/* Bar Chart: Asset-wise Exposure */}
        <div className="p-5 rounded-xl bg-[#070e1b] border border-[#1e293b] flex flex-col">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-400" /> Asset-Wise Financial Exposure
            </span>
            <span className="text-[10px] text-slate-400">Node Criticality Rank</span>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            <canvas ref={barCanvasRef} width={420} height={220} className="w-full h-auto" />
          </div>
        </div>
      </div>

      {/* Before-and-After Security Control Comparison */}
      <div className="p-5 rounded-xl bg-[#0c1527] border border-cyan-500/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 text-sm">
              Before & After Security Control ROI Model (NIST CSF & IEC 62443 Hardening)
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
            72% Loss Reduction Projected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-[#070e1b] border border-rose-500/40">
            <span className="text-[10px] text-rose-400 uppercase font-semibold">Current State (Baseline Exposure)</span>
            <div className="text-2xl font-extrabold text-rose-300 my-1">{formatINR(baselineExposure)}</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Standard legacy SCADA gateways with VPN access and single-point substation authentication.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#070e1b] border border-emerald-500/40">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold">Hardened State (IEC 62443 + Zero Trust)</span>
            <div className="text-2xl font-extrabold text-emerald-300 my-1">{formatINR(hardenedExposure)}</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              OT Microsegmentation, hardware cryptographic attestation, diode unidirectional links, and AI anomaly filters.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#070e1b] border border-cyan-500/40">
            <span className="text-[10px] text-cyan-400 uppercase font-semibold">Net Avoided Financial Exposure</span>
            <div className="text-2xl font-extrabold text-cyan-300 my-1">{formatINR(savedExposure)}</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Annualized return on security investment (ROSI) demonstrates positive payback within 8 months.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
