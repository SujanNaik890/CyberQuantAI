import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGridStore } from '../store/gridStore';
import { Generator, Substation, LoadCenter, TransmissionLine } from '../engine/gridModel';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface Particle {
  lineId: string;
  progress: number; // 0 to 1
  speed: number;
  size: number;
  color: string;
}

export const SynopticCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);
  const lines = useGridStore((s) => s.lines);
  const selectedAsset = useGridStore((s) => s.selectedAsset);
  const selectAsset = useGridStore((s) => s.selectAsset);

  // Pan & Zoom state
  const [transform, setTransform] = useState({ x: 40, y: 30, scale: 0.95 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Particles for electron / energy pulse flow
  const particlesRef = useRef<Particle[]>([]);

  // Find node coordinates helper
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

  // Initialize or update particles based on lines
  useEffect(() => {
    // Keep ~3-5 particles per active line
    const currentParticles = particlesRef.current;
    const newParticles: Particle[] = [];

    lines.forEach((line) => {
      if (line.isTripped || Math.abs(line.curFlowMW) < 2) return;

      const util = Math.abs(line.curFlowMW) / line.thermalLimitMW;
      let particleColor = '#10b981'; // Emerald <= 80%
      if (util > 1.0) {
        particleColor = '#f43f5e'; // Glowing Crimson
      } else if (util > 0.8) {
        particleColor = '#f59e0b'; // Amber
      } else {
        particleColor = '#38bdf8'; // Cyan
      }

      // Existing particles for this line
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

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Resize handling
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Save context for transform
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // 1. Draw Blueprint Dot Grid Background
      const gridSize = 40;
      const worldLeft = -transform.x / transform.scale;
      const worldTop = -transform.y / transform.scale;
      const worldRight = worldLeft + width / transform.scale;
      const worldBottom = worldTop + height / transform.scale;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.07)';
      for (let x = Math.floor(worldLeft / gridSize) * gridSize; x < worldRight; x += gridSize) {
        for (let y = Math.floor(worldTop / gridSize) * gridSize; y < worldBottom; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Transmission Lines (Corridors)
      lines.forEach((line) => {
        const fromCoord = getNodeCoord(line.fromNodeId);
        const toCoord = getNodeCoord(line.toNodeId);
        if (!fromCoord || !toCoord) return;

        const isSelected = selectedAsset?.type === 'line' && selectedAsset.id === line.id;
        const util = Math.abs(line.curFlowMW) / line.thermalLimitMW;
        const isOverloaded = !line.isTripped && util > 1.0;

        // Path
        ctx.beginPath();
        ctx.moveTo(fromCoord.x, fromCoord.y);
        ctx.lineTo(toCoord.x, toCoord.y);

        if (line.isTripped) {
          // Tripped line: Dashed Dark Red
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = '#881337'; // Rose dark
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.setLineDash([]);
          // Normal line glow
          if (isOverloaded) {
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
            ctx.lineWidth = 6 + Math.sin(Date.now() / 150) * 2;
            ctx.stroke();

            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 3;
            ctx.stroke();
          } else if (isSelected) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
            ctx.lineWidth = 6;
            ctx.stroke();

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            // Standard corridor
            const color =
              util > 0.8
                ? '#f59e0b'
                : line.voltageKV === 500
                ? '#38bdf8'
                : '#818cf8';
            ctx.strokeStyle = color;
            ctx.lineWidth = line.voltageKV === 500 ? 3 : 2;
            ctx.globalAlpha = 0.75;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }

          // Flow Direction Arrows & Telemetry Label in Middle
          const midX = (fromCoord.x + toCoord.x) / 2;
          const midY = (fromCoord.y + toCoord.y) / 2;

          // Flow badge
          ctx.fillStyle = '#070e1b';
          ctx.strokeStyle = isOverloaded ? '#f43f5e' : '#1e293b';
          ctx.lineWidth = 1;
          const badgeText = `${Math.round(line.curFlowMW)} MW`;
          ctx.font = '10px monospace';
          const textWidth = ctx.measureText(badgeText).width;
          
          ctx.fillRect(midX - textWidth / 2 - 4, midY - 8, textWidth + 8, 16);
          ctx.strokeRect(midX - textWidth / 2 - 4, midY - 8, textWidth + 8, 16);

          ctx.fillStyle = isOverloaded ? '#fda4af' : util > 0.8 ? '#fcd34d' : '#94a3b8';
          ctx.fillText(badgeText, midX - textWidth / 2, midY + 4);
        }
      });

      // 3. Draw Flow Particles (Energy Packets)
      particlesRef.current.forEach((p) => {
        const line = lines.find((l) => l.id === p.lineId);
        if (!line || line.isTripped) return;

        const fromCoord = getNodeCoord(line.fromNodeId);
        const toCoord = getNodeCoord(line.toNodeId);
        if (!fromCoord || !toCoord) return;

        // If flow is negative, move reverse
        const isReverse = line.curFlowMW < 0;
        p.progress = (p.progress + p.speed) % 1.0;

        const effectiveT = isReverse ? 1.0 - p.progress : p.progress;
        const px = fromCoord.x + (toCoord.x - fromCoord.x) * effectiveT;
        const py = fromCoord.y + (toCoord.y - fromCoord.y) * effectiveT;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // 4. Draw Nodes: Substations (Hexagons/Diamonds), Generators (Circles), Loads (Squares)
      
      // Substations
      substations.forEach((sub) => {
        const isSelected = selectedAsset?.type === 'substation' && selectedAsset.id === sub.id;
        const isHovered = hoveredNode === sub.id;

        ctx.save();
        ctx.translate(sub.x, sub.y);

        // Halo
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(129, 140, 248, 0.2)';
          ctx.fill();
        }

        // Diamond / Hexagon shape
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(16, 0);
        ctx.lineTo(0, 16);
        ctx.lineTo(-16, 0);
        ctx.closePath();

        ctx.fillStyle = '#070e1b';
        ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = '#818cf8';
        ctx.stroke();

        // Inner core
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = sub.busStatus === 'energized' ? '#818cf8' : '#f43f5e';
        ctx.fill();

        ctx.restore();

        // Node Label
        ctx.font = '11px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(sub.name, sub.x, sub.y + 28);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#818cf8';
        ctx.fillText(`${sub.highVoltageKV}kV • ${sub.activeThroughputMW}MW`, sub.x, sub.y + 40);
      });

      // Generators
      generators.forEach((gen) => {
        const isSelected = selectedAsset?.type === 'generator' && selectedAsset.id === gen.id;
        const isHovered = hoveredNode === gen.id;
        const isOnline = gen.status === 'online';

        ctx.save();
        ctx.translate(gen.x, gen.y);

        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(0, 0, 28, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.fill();
        }

        // Outer circular shell
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#0c1527';
        ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = isOnline ? '#38bdf8' : '#f43f5e';
        ctx.stroke();

        // Generator Symbol: Sine wave ~
        ctx.beginPath();
        ctx.strokeStyle = isOnline ? '#38bdf8' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.arc(-4, 0, 4, Math.PI, 0, false);
        ctx.arc(4, 0, 4, 0, Math.PI, false);
        ctx.stroke();

        ctx.restore();

        // Node Label
        ctx.font = '11px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(gen.name, gen.x, gen.y - 26);
        ctx.font = '9px monospace';
        ctx.fillStyle = isOnline ? '#38bdf8' : '#f43f5e';
        ctx.fillText(isOnline ? `${Math.round(gen.curMW)} MW` : 'TRIPPED', gen.x, gen.y - 38);
      });

      // Load Centers
      loads.forEach((load) => {
        const isSelected = selectedAsset?.type === 'load' && selectedAsset.id === load.id;
        const isHovered = hoveredNode === load.id;

        ctx.save();
        ctx.translate(load.x, load.y);

        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
          ctx.fill();
        }

        // Rounded Square for Load
        const size = 32;
        ctx.fillStyle = '#0c1527';
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = load.isShed ? '#f43f5e' : '#f59e0b';
        ctx.strokeRect(-size / 2, -size / 2, size, size);

        // Load Symbol: Arrow down
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(0, 7);
        ctx.lineTo(-4, 3);
        ctx.moveTo(0, 7);
        ctx.lineTo(4, 3);
        ctx.strokeStyle = load.isShed ? '#f43f5e' : '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // Node Label
        ctx.font = '11px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(load.name, load.x, load.y + 28);
        ctx.font = '9px monospace';
        ctx.fillStyle = load.isShed ? '#f43f5e' : '#f59e0b';
        ctx.fillText(load.isShed ? 'SHED' : `${Math.round(load.curDemandMW)} MW (T${load.priorityTier})`, load.x, load.y + 40);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [generators, substations, loads, lines, transform, selectedAsset, hoveredNode, getNodeCoord]);

  // Pan & Zoom Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
      return;
    }

    // Check hit testing for hover
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseWorldX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseWorldY = (e.clientY - rect.top - transform.y) / transform.scale;

    let foundId: string | null = null;
    [...generators, ...substations, ...loads].forEach((node) => {
      const dist = Math.hypot(node.x - mouseWorldX, node.y - mouseWorldY);
      if (dist < 25) {
        foundId = node.id;
      }
    });

    setHoveredNode(foundId);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.max(0.4, Math.min(2.5, transform.scale * zoomFactor));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered on cursor
    setTransform((prev) => ({
      scale: newScale,
      x: mouseX - (mouseX - prev.x) * (newScale / prev.scale),
      y: mouseY - (mouseY - prev.y) * (newScale / prev.scale),
    }));
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseWorldX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseWorldY = (e.clientY - rect.top - transform.y) / transform.scale;

    // Check generators
    for (const gen of generators) {
      if (Math.hypot(gen.x - mouseWorldX, gen.y - mouseWorldY) < 25) {
        selectAsset({ type: 'generator', id: gen.id });
        return;
      }
    }
    // Check substations
    for (const sub of substations) {
      if (Math.hypot(sub.x - mouseWorldX, sub.y - mouseWorldY) < 25) {
        selectAsset({ type: 'substation', id: sub.id });
        return;
      }
    }
    // Check loads
    for (const load of loads) {
      if (Math.hypot(load.x - mouseWorldX, load.y - mouseWorldY) < 25) {
        selectAsset({ type: 'load', id: load.id });
        return;
      }
    }

    // Check lines
    for (const line of lines) {
      const from = getNodeCoord(line.fromNodeId);
      const to = getNodeCoord(line.toNodeId);
      if (!from || !to) continue;

      // Distance from point to line segment
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const lengthSquared = dx * dx + dy * dy;
      let t = ((mouseWorldX - from.x) * dx + (mouseWorldY - from.y) * dy) / lengthSquared;
      t = Math.max(0, Math.min(1, t));
      const projX = from.x + t * dx;
      const projY = from.y + t * dy;
      const dist = Math.hypot(mouseWorldX - projX, mouseWorldY - projY);

      if (dist < 12) {
        selectAsset({ type: 'line', id: line.id });
        return;
      }
    }
  };

  const resetView = () => {
    setTransform({ x: 40, y: 30, scale: 0.95 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-[54vh] min-h-[380px] bg-[#050b14] overflow-hidden select-none border-b border-[#1e293b]">
      {/* Schematic Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      />

      {/* Canvas HUD Controls Overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#070e1b]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e293b] font-mono text-xs text-slate-300">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <Move className="w-3.5 h-3.5" /> SYNOPTIC TOPOLOGY MAP
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Scroll to Zoom • Drag to Pan</span>
      </div>

      {/* Zoom Control Buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#070e1b]/90 backdrop-blur-md p-1 rounded-lg border border-[#1e293b]">
        <button
          onClick={() => setTransform((prev) => ({ ...prev, scale: Math.min(2.5, prev.scale * 1.15) }))}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransform((prev) => ({ ...prev, scale: Math.max(0.4, prev.scale * 0.85) }))}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors"
          title="Reset Frame"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend Pill */}
      <div className="absolute bottom-3 left-3 hidden md:flex items-center gap-4 bg-[#070e1b]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e293b] font-mono text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Generation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rotate-45 bg-indigo-400" /> Substation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-amber-400" /> Load Center
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-rose-500 animate-pulse" /> Overload / Tripped
        </span>
      </div>
    </div>
  );
};
