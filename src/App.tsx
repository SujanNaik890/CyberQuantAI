import React, { useEffect, useRef } from 'react';
import { useGridStore } from './store/gridStore';
import { TopHeader } from './components/TopHeader';
import { LeftSidebar } from './components/LeftSidebar';
import { SynopticCanvas } from './components/SynopticCanvas';
import { TelemetryTable } from './components/TelemetryTable';
import { InspectorPanel } from './components/InspectorPanel';

export function App() {
  const tick = useGridStore((s) => s.tick);
  const lastTimeRef = useRef<number>(performance.now());

  // Real-time 60 FPS physics tick loop
  useEffect(() => {
    let animId: number;

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTimeRef.current) / 1000); // delta time in seconds, clamped
      lastTimeRef.current = currentTime;

      tick(dt);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [tick]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050b14] text-slate-100 overflow-hidden font-sans">
      {/* 1. Cockpit Top Header */}
      <TopHeader />

      {/* 2. Cockpit 3-Panel Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Dispatch & Asset Sector Sidebar */}
        <LeftSidebar />

        {/* Center Viewport: Upper Synoptic Canvas + Lower Branch Telemetry Table */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#050b14] overflow-hidden">
          <SynopticCanvas />
          <TelemetryTable />
        </main>

        {/* Right Station Inspector, Dynamic Oscilloscope & Event Log */}
        <InspectorPanel />
      </div>
    </div>
  );
}

export default App;
