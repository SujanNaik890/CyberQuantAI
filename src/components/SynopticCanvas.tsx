import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGridStore } from '../store/gridStore';
import { Box, Layers, MapPin } from 'lucide-react';
import { Synoptic3DView } from './Synoptic3DView';
import { RegionalMapGeoView } from './RegionalMapGeoView';

interface Particle {
  lineId: string;
  progress: number;
  speed: number;
  size: number;
  color: string;
}

export const SynopticCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [viewMode, setViewMode] = useState<'3D' | 'MAP' | '2D'>('3D');

  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);
  const lines = useGridStore((s) => s.lines);
  const selectedAsset = useGridStore((s) => s.selectedAsset);

  // Pan & Zoom state for 2D mode
  const [transform, setTransform] = useState({ x: 300, y: 190, scale: 3.5 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const particlesRef = useRef<Particle[]>([]);

  const getNodeCoord = useCallback(
    (nodeId: string): { x: number; y: number; name: string; type: string } | null => {
      const g = generators.find((item) => item.id === nodeId);
      if (g) return { x: g.x, y: g.y, name: g.name, type: 'generator' };
      const s = substations.find((item) => item.id === nodeId);
      if (s) return { x: s.x, y: s.y, name: s.name, type: 'substation' };
      const l = loads.find((item) => item.id === nodeId);
      if (l) return { x: l.x, y: l.y, name: l.name, type: 'load' };
      return null;
    },
    [generators, substations, loads]
  );

  useEffect(() => {
    const currentParticles = particlesRef.current;
    const newParticles: Particle[] = [];

    lines.forEach((line) => {
      if (line.isTripped || Math.abs(line.curFlowMW) < 2) return;

      const util = Math.abs(line.curFlowMW) / line.thermalLimitMW;
      let particleColor = '#10b981';
      if (util > 1.0) {
        particleColor = '#f43f5e';
      } else if (util > 0.8) {
        particleColor = '#f59e0b';
      } else {
        particleColor = '#38bdf8';
      }

      const existing = currentParticles.filter((p) => p.lineId === line.id);
      const targetCount = Math.max(2, Math.min(6, Math.floor(util * 6)));

      for (let i = 0; i < targetCount; i++) {
        if (existing[i]) {
          existing[i].color = particleColor;
          existing[i].speed = 0.003 + util * 0.012;
          newParticles.push(existing[i]);
        } else {
          newParticles.push({
            lineId: line.id,
            progress: Math.random(),
            speed: 0.003 + util * 0.012,
            size: util > 1.0 ? 3.5 : 2.5,
            color: particleColor,
          });
        }
      }
    });

    particlesRef.current = newParticles;
  }, [lines]);

  // Main 2D Canvas Loop (when in 2D mode)
  useEffect(() => {
    if (viewMode !== '2D') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // Blueprint dot grid
      const gridSize = 10;
      const worldLeft = -transform.x / transform.scale;
      const worldTop = -transform.y / transform.scale;
      const worldRight = worldLeft + width / transform.scale;
      const worldBottom = worldTop + height / transform.scale;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
      for (let x = Math.floor(worldLeft / gridSize) * gridSize; x < worldRight; x += gridSize) {
        for (let y = Math.floor(worldTop / gridSize) * gridSize; y < worldBottom; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Lines
      lines.forEach((line) => {
        const fromCoord = getNodeCoord(line.fromNodeId);
        const toCoord = getNodeCoord(line.toNodeId);
        if (!fromCoord || !toCoord) return;

        const isSelected = selectedAsset?.type === 'line' && selectedAsset.id === line.id;
        const util = Math.abs(line.curFlowMW) / line.thermalLimitMW;
        const isOverloaded = !line.isTripped && util > 1.0;

        ctx.beginPath();
        ctx.moveTo(fromCoord.x, fromCoord.y);
        ctx.lineTo(toCoord.x, toCoord.y);

        if (line.isTripped) {
          ctx.setLineDash([1.5, 1.5]);
          ctx.strokeStyle = '#881337';
          ctx.lineWidth = isSelected ? 1.0 : 0.6;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.setLineDash([]);
          const color = isOverloaded
            ? '#f43f5e'
            : util > 0.8
            ? '#f59e0b'
            : line.voltageKV === 400
            ? '#38bdf8'
            : line.voltageKV === 220
            ? '#818cf8'
            : '#f59e0b';
          ctx.strokeStyle = color;
          ctx.lineWidth = isSelected ? 1.4 : line.voltageKV === 400 ? 1.0 : 0.6;
          ctx.stroke();
        }
      });

      // Draw particles
      particlesRef.current.forEach((p) => {
        const line = lines.find((l) => l.id === p.lineId);
        if (!line || line.isTripped) return;
        const fromCoord = getNodeCoord(line.fromNodeId);
        const toCoord = getNodeCoord(line.toNodeId);
        if (!fromCoord || !toCoord) return;

        const isReverse = line.curFlowMW < 0;
        p.progress = (p.progress + p.speed) % 1.0;
        const effT = isReverse ? 1.0 - p.progress : p.progress;
        const px = fromCoord.x + (toCoord.x - fromCoord.x) * effT;
        const py = fromCoord.y + (toCoord.y - fromCoord.y) * effT;

        ctx.beginPath();
        ctx.arc(px, py, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // Draw Nodes
      [...substations, ...generators, ...loads].forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#0c1527';
        ctx.fill();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();

        ctx.font = '2px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(node.name.split(' ')[0], node.x, node.y + 3.8);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [viewMode, generators, substations, loads, lines, transform, selectedAsset, getNodeCoord]);

  return (
    <div ref={containerRef} className="relative w-full h-[54vh] min-h-[380px] bg-[#050b14] overflow-hidden select-none border-b border-[#1e293b]">
      {/* 3D vs MAP vs 2D Render Mode */}
      {viewMode === '3D' ? (
        <Synoptic3DView />
      ) : viewMode === 'MAP' ? (
        <RegionalMapGeoView />
      ) : (
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y }); }}
          onMouseMove={(e) => {
            if (isDragging) {
              setTransform((prev) => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          className="w-full h-full block cursor-crosshair"
        />
      )}

      {/* Mode Switcher Pills (Top Left) */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#070e1b]/90 backdrop-blur-md p-1 rounded-lg border border-[#1e293b] font-mono text-xs z-[1001] shadow-xl">
        <button
          onClick={() => setViewMode('3D')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all font-semibold ${
            viewMode === '3D'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" /> 3D City & Grid
        </button>
        <button
          onClick={() => setViewMode('MAP')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all font-semibold ${
            viewMode === 'MAP'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> Satellite / Map API
        </button>
        <button
          onClick={() => setViewMode('2D')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all font-semibold ${
            viewMode === '2D'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> 2D Schematic
        </button>
      </div>

      {/* 3D Controls Hint */}
      {viewMode === '3D' && (
        <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-2 bg-[#070e1b]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e293b] font-mono text-[11px] text-slate-400 z-10">
          <span className="text-cyan-400 font-bold">3D Orbit:</span> Left-Click + Drag to Rotate • Right-Click to Pan • Scroll to Zoom
        </div>
      )}
    </div>
  );
};
