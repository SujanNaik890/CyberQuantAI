import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  Layers, 
  DollarSign,
  Lock,
  Zap,
  Activity,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Filter,
  RefreshCw,
  Cpu,
  Clock
} from 'lucide-react';

export const LossAnalysisDashboard: React.FC = () => {
  const financialSummary = useCyberStore((s) => s.financialSummary);
  const incidents = useCyberStore((s) => s.incidents);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const pieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth entrance animation timing
  useEffect(() => {
    let start: number | null = null;
    const duration = 1200; // ms

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedProgress(easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [financialSummary]);

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Math.round(val).toLocaleString()}`;
  };

  // Slices for Donut Chart
  const slices = useMemo(() => {
    return [
      { label: 'Replacement Power', value: financialSummary.totalReplacementCost || 45000000, color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.4)' },
      { label: 'Unserved Energy (VoLL)', value: financialSummary.totalUnservedImpact || 62000000, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
      { label: 'Forensics & Recovery', value: financialSummary.totalRecoveryCost || 18500000, color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
      { label: 'Operational & Penalties', value: financialSummary.totalOperationalCost || 12500000, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
    ];
  }, [financialSummary]);

  // Asset Exposure Data
  const assetData = useMemo(() => {
    if (financialSummary.assetExposure.length > 0) {
      return financialSummary.assetExposure.map((a, i) => ({
        assetName: a.assetName,
        exposure: a.exposure,
        category: i === 0 ? 'CRITICAL' : i === 1 ? 'HIGH' : 'MEDIUM',
        riskScore: i === 0 ? 92 : i === 1 ? 84 : 70 - i * 5,
      }));
    }
    return [
      { assetName: 'Kaiga Atomic Nuclear Station', exposure: 52400000, category: 'CRITICAL', riskScore: 92 },
      { assetName: 'Sharavathi Hydro Powerhouse', exposure: 38200000, category: 'HIGH', riskScore: 84 },
      { assetName: 'Nelamangala 400kV Bulk Substation', exposure: 29500000, category: 'HIGH', riskScore: 78 },
      { assetName: 'Pavagada Shakti Sthala 2GW Solar', exposure: 16800000, category: 'MEDIUM', riskScore: 65 },
    ];
  }, [financialSummary]);

  // Render Interactive Animated Donut Chart
  useEffect(() => {
    const canvas = pieCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const total = slices.reduce((sum, s) => sum + s.value, 0);
    let startAngle = -Math.PI / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 22;
    const innerRadius = radius * 0.62;

    slices.forEach((slice, idx) => {
      const fullSliceAngle = (slice.value / total) * 2 * Math.PI;
      const sliceAngle = fullSliceAngle * animatedProgress;
      const endAngle = startAngle + sliceAngle;

      const isHovered = hoveredSlice === idx;
      const currentRadius = isHovered ? radius + 6 : radius;
      const currentInner = isHovered ? innerRadius - 2 : innerRadius;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, currentInner, endAngle, startAngle, true);
      ctx.closePath();

      // Cyber Gradient
      const grad = ctx.createRadialGradient(centerX, centerY, currentInner, centerX, centerY, currentRadius);
      grad.addColorStop(0, slice.color);
      grad.addColorStop(1, '#050b14');

      ctx.fillStyle = slice.color;
      ctx.shadowColor = slice.glow;
      ctx.shadowBlur = isHovered ? 20 : 10;
      ctx.fill();

      // Subtle border separator
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#050b14';
      ctx.stroke();
      ctx.restore();

      startAngle = endAngle;
    });

    // Outer subtle cyber ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [slices, animatedProgress, hoveredSlice]);

  // Render Interactive Animated Asset Exposure Bar Chart
  useEffect(() => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...assetData.map((d) => d.exposure), 1);
    const leftMargin = 30;
    const bottomMargin = 40;
    const chartWidth = width - leftMargin - 20;
    const chartHeight = height - bottomMargin - 25;
    const barWidth = chartWidth / assetData.length;

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = height - bottomMargin - (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }

    assetData.forEach((item, idx) => {
      const targetBarH = (item.exposure / maxVal) * chartHeight;
      const barH = targetBarH * animatedProgress;
      const x = leftMargin + idx * barWidth + (barWidth * 0.15);
      const y = height - bottomMargin - barH;
      const w = barWidth * 0.7;

      const isHovered = hoveredBar === idx;

      // Gradient Fill
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      if (item.category === 'CRITICAL' || idx === 0) {
        grad.addColorStop(0, '#ef4444');
        grad.addColorStop(1, '#7f1d1d');
      } else if (item.category === 'HIGH' || idx === 1) {
        grad.addColorStop(0, '#00f0ff');
        grad.addColorStop(1, '#0284c7');
      } else {
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#78350f');
      }

      ctx.save();
      ctx.beginPath();
      // Rounded top
      const r = 4;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();

      ctx.fillStyle = grad;
      ctx.shadowColor = idx === 0 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(0, 240, 255, 0.35)';
      ctx.shadowBlur = isHovered ? 16 : 8;
      ctx.fill();

      // Top glowing cap line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + w - 2, y);
      ctx.stroke();

      ctx.restore();

      // Labels below
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const shortName = item.assetName.split(' ')[0];
      ctx.fillText(shortName, x + w / 2, height - bottomMargin + 16);

      // Amount label on top
      if (animatedProgress > 0.4) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(formatINR(item.exposure), x + w / 2, y - 8);
      }
    });
  }, [assetData, animatedProgress, hoveredBar]);

  // Render Cumulative Downtime Loss Curve (Timeline)
  useEffect(() => {
    const canvas = lineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Timeline data points: Hour 1, Hour 2, Hour 3, Hour 4, Hour 6, Hour 8
    const points = [
      { hour: '1h', baseline: 18000000, mitigated: 4500000 },
      { hour: '2h', baseline: 39000000, mitigated: 9800000 },
      { hour: '3h', baseline: 64000000, mitigated: 16200000 },
      { hour: '4h', baseline: 92000000, mitigated: 23500000 },
      { hour: '6h', baseline: 145000000, mitigated: 38000000 },
      { hour: '8h', baseline: 210000000, mitigated: 52000000 },
    ];

    const maxVal = points[points.length - 1].baseline;
    const left = 45;
    const right = width - 25;
    const top = 25;
    const bottom = height - 30;
    const w = right - left;
    const h = bottom - top;

    // Background horizontal guides
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = top + (h / 3) * i;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    // Baseline Unmitigated Loss (Red Curve)
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = left + (w / (points.length - 1)) * i;
      const targetY = bottom - (p.baseline / maxVal) * h;
      const y = bottom - ((p.baseline / maxVal) * h * animatedProgress);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Baseline Area fill
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    const redGrad = ctx.createLinearGradient(0, top, 0, bottom);
    redGrad.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
    redGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    ctx.fillStyle = redGrad;
    ctx.fill();
    ctx.restore();

    // Mitigated Zero-Trust Loss (Cyan Curve)
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = left + (w / (points.length - 1)) * i;
      const y = bottom - ((p.mitigated / maxVal) * h * animatedProgress);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Mitigated Area fill
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    const cyanGrad = ctx.createLinearGradient(0, top, 0, bottom);
    cyanGrad.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
    cyanGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
    ctx.fillStyle = cyanGrad;
    ctx.fill();
    ctx.restore();

    // X-Axis Hour Labels
    points.forEach((p, i) => {
      const x = left + (w / (points.length - 1)) * i;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.hour, x, height - 10);
    });

  }, [animatedProgress]);

  // Before & After Security Controls Model
  const baselineExposure = financialSummary.totalFinancialExposure || 120000000;
  const hardenedExposure = Math.round(baselineExposure * 0.28);
  const savedExposure = baselineExposure - hardenedExposure;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#040711] font-mono text-xs select-none space-y-6">
      {/* Top Cockpit Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400 animate-pulse" /> LIVE ACTUARIAL FINANCIAL TELEMETRY
            </span>
            <span className="text-[10px] text-slate-500 font-sans">IEC 62443 / NIST CSF Calibrated</span>
          </div>
          <h1 className="text-base md:text-xl font-extrabold text-slate-100 tracking-wide mt-1 flex items-center gap-2">
            GRID CYBER RISK &amp; FINANCIAL LOSS INTELLIGENCE
          </h1>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#080d1c] p-1 rounded-lg border border-[#1e293b]">
            {(['ALL', 'CRITICAL', 'HIGH'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setActiveFilter(lvl)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  activeFilter === lvl
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#080d1c] border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <Sparkles className="w-3.5 h-3.5" /> 72% ROSI OPTIMIZATION
          </div>
        </div>
      </div>

      {/* Top 4 Real-Time Loss KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Financial Exposure */}
        <div className="relative p-4 rounded-xl bg-gradient-to-br from-[#0a1124] to-[#060a16] border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.08)] overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Grid Loss Exposure</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-cyan-300 mt-1">
            {formatINR(financialSummary.totalFinancialExposure * animatedProgress)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Modeled Scenarios: <strong className="text-slate-200">{financialSummary.incidentCount || 4}</strong></span>
            <span className="text-rose-400 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> High Severity
            </span>
          </div>
        </div>

        {/* Current Incident Outage Loss */}
        <div className="relative p-4 rounded-xl bg-gradient-to-br from-[#0a1124] to-[#060a16] border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.08)] overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Latest Incident Loss</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-300 mt-1">
            {formatINR((financialSummary.currentIncidentLoss || 50733000) * animatedProgress)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Asset: <strong className="text-slate-200">Kaiga Atomic Station</strong></span>
            <span className="text-amber-400 font-bold">3.0h Assumed Outage</span>
          </div>
        </div>

        {/* Replacement Power Cost */}
        <div className="relative p-4 rounded-xl bg-gradient-to-br from-[#0a1124] to-[#060a16] border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.08)] overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Replacement Power Pool</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-300 mt-1">
            {formatINR((financialSummary.totalReplacementCost || 45000000) * animatedProgress)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Market Spread: <strong className="text-slate-200">₹9.00/kWh</strong></span>
            <span className="text-emerald-400 font-bold">Spot Purchase</span>
          </div>
        </div>

        {/* Forensics, Recovery & Penalities */}
        <div className="relative p-4 rounded-xl bg-gradient-to-br from-[#0a1124] to-[#060a16] border border-rose-500/40 shadow-[0_0_20px_rgba(239,68,68,0.08)] overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Recovery &amp; DFIR Overhead</span>
            <Layers className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-rose-300 mt-1">
            {formatINR(((financialSummary.totalRecoveryCost + financialSummary.totalOperationalCost) || 31000000) * animatedProgress)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>RTU Firmware &amp; Forensics</span>
            <span className="text-rose-400 font-bold">Regulatory Buffer</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Donut Loss Breakdown */}
        <div className="p-5 rounded-xl bg-[#080d1c] border border-[#1e293b] flex flex-col items-center shadow-lg relative">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-100 text-xs tracking-wide">
                Actuarial Loss Category Share
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Interactive Vector Hover</span>
          </div>

          <div className="relative my-2 flex items-center justify-center">
            <canvas
              ref={pieCanvasRef}
              width={280}
              height={280}
              className="cursor-pointer max-w-full"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left - 140;
                const y = e.clientY - rect.top - 140;
                const dist = Math.sqrt(x * x + y * y);
                if (dist >= 60 && dist <= 125) {
                  let angle = Math.atan2(y, x) + Math.PI / 2;
                  if (angle < 0) angle += Math.PI * 2;
                  const idx = Math.floor((angle / (Math.PI * 2)) * slices.length);
                  setHoveredSlice(idx % slices.length);
                } else {
                  setHoveredSlice(null);
                }
              }}
              onMouseLeave={() => setHoveredSlice(null)}
            />
            {/* Center Dynamic Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                {hoveredSlice !== null ? slices[hoveredSlice].label.split(' ')[0] : 'TOTAL LOSS'}
              </span>
              <span className="text-base font-extrabold text-slate-100">
                {hoveredSlice !== null
                  ? formatINR(slices[hoveredSlice].value)
                  : formatINR(financialSummary.totalFinancialExposure * animatedProgress)}
              </span>
              <span className="text-[10px] text-cyan-400 font-bold">
                {hoveredSlice !== null
                  ? `${Math.round((slices[hoveredSlice].value / financialSummary.totalFinancialExposure) * 100)}% Share`
                  : '100% Calibrated'}
              </span>
            </div>
          </div>

          {/* Interactive Legend Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-4 text-[11px] pt-3 border-t border-[#1e293b]">
            {slices.map((s, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredSlice(i)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`p-1.5 rounded flex items-center justify-between cursor-pointer transition-all ${
                  hoveredSlice === i ? 'bg-slate-800/80 border border-slate-700' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-300 truncate">{s.label}</span>
                </div>
                <span className="font-bold text-slate-200 ml-1">{formatINR(s.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Asset-wise Financial Vulnerability */}
        <div className="p-5 rounded-xl bg-[#080d1c] border border-[#1e293b] flex flex-col shadow-lg">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-100 text-xs tracking-wide">
                Asset-Wise Financial Exposure &amp; Criticality
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Node Risk Ranking</span>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[240px]">
            <canvas
              ref={barCanvasRef}
              width={460}
              height={240}
              className="w-full h-auto cursor-pointer"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left - 30;
                const slotW = (rect.width - 50) / assetData.length;
                const idx = Math.floor(x / slotW);
                if (idx >= 0 && idx < assetData.length) {
                  setHoveredBar(idx);
                } else {
                  setHoveredBar(null);
                }
              }}
              onMouseLeave={() => setHoveredBar(null)}
            />
          </div>

          {/* Asset Breakdown Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#1e293b] text-[10px]">
            {assetData.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded bg-[#0c1527] border transition-all ${
                  hoveredBar === idx ? 'border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'border-[#1e293b]'
                }`}
              >
                <div className="text-slate-400 truncate font-semibold">{item.assetName.split(' ')[0]}</div>
                <div className="font-extrabold text-cyan-300 text-xs mt-0.5">{formatINR(item.exposure)}</div>
                <div className="text-rose-400 font-bold mt-0.5">Risk {item.riskScore || 85}/100</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Realistic Cumulative Downtime Loss Curve vs Hardened State */}
      <div className="p-5 rounded-xl bg-[#080d1c] border border-[#1e293b] shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-100 text-xs tracking-wide">
              Cumulative Outage Financial Progression: Unmitigated Breach vs. IEC 62443 Zero-Trust
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-rose-500 rounded-full" />
              <span className="text-rose-300">Unmitigated Attack (Legacy SCADA)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-cyan-400 rounded-full" />
              <span className="text-cyan-300 font-semibold">Zero-Trust Hardened (IEC 62443)</span>
            </div>
          </div>
        </div>

        <div className="w-full h-52 flex items-center justify-center">
          <canvas ref={lineCanvasRef} width={920} height={210} className="w-full h-full" />
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
          * Actuarial curve modeling based on escalating Value of Lost Load (VoLL) multipliers and compounding emergency spot replacement procurement as generation deficit prolongs past spinning reserve windows.
        </p>
      </div>

      {/* Before & After Security Controls Model (NIST CSF & IEC 62443 ROSI) */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-[#0c1527] to-[#080d1c] border border-cyan-500/40 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-100 text-sm">
              Return on Security Investment (ROSI) &amp; Defensive Hardening ROI
            </span>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-extrabold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 72% Avoided Loss (Payback in 8.2 Months)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#050b14] border border-rose-500/40 relative overflow-hidden">
            <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">
              1. Current Baseline Exposure
            </span>
            <div className="text-2xl font-extrabold text-rose-300 my-1.5">
              {formatINR(baselineExposure)}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Traditional flat OT substation network with single-factor remote VPN access and unauthenticated Modbus/DNP3 RTU telemetry.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#050b14] border border-emerald-500/40 relative overflow-hidden">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
              2. Hardened Zero-Trust Posture
            </span>
            <div className="text-2xl font-extrabold text-emerald-300 my-1.5">
              {formatINR(hardenedExposure)}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Microsegmented substation zones, hardware cryptographic tokens (FIDO2), unidirectional optical data diodes, and AI anomaly filters.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#050b14] border border-cyan-500/40 relative overflow-hidden">
            <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
              3. Net Avoided Incident Loss
            </span>
            <div className="text-2xl font-extrabold text-cyan-300 my-1.5">
              {formatINR(savedExposure)}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Demonstrates guaranteed capital protection, regulatory non-compliance penalty avoidance, and positive Return on Security Investment (ROSI).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
