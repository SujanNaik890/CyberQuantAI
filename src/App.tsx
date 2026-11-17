import React, { useEffect, useRef } from 'react';
import { useGridStore } from './store/gridStore';
import { useCyberStore } from './store/cyberStore';
import { initCyberWebSocket } from './services/cyberWebSocket';
import { TopHeader } from './components/TopHeader';
import { LeftSidebar } from './components/LeftSidebar';
import { SynopticCanvas } from './components/SynopticCanvas';
import { TelemetryTable } from './components/TelemetryTable';
import { InspectorPanel } from './components/InspectorPanel';
import { CyberNavBar } from './components/cyber/CyberNavBar';
import { RiskDetectionPanel } from './components/cyber/RiskDetectionPanel';
import { RiskAlertsPanel } from './components/cyber/RiskAlertsPanel';
import { FinancialAnalyzer } from './components/cyber/FinancialAnalyzer';
import { LossAnalysisDashboard } from './components/cyber/LossAnalysisDashboard';
import { AIChatPanel } from './components/cyber/AIChatPanel';
import { AttackEnginePanel } from './components/cyber/AttackEnginePanel';

export function App() {
  const tick = useGridStore((s) => s.tick);
  const activeNavTab = useCyberStore((s) => s.activeNavTab);
  const setNavTab = useCyberStore((s) => s.setNavTab);
  const fetchInitialData = useCyberStore((s) => s.fetchInitialData);
  const lastTimeRef = useRef<number>(performance.now());

  // URL / Route synchronization: Supports direct links such as http://localhost:5173/attacks or #/attacks
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.replace(/^\//, '').toLowerCase();
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const route = hash || path;

      if (route === 'attack' || route === 'attacks' || route === 'attack-engine') {
        setNavTab('attacks');
      } else if (route === 'alerts' || route === 'risk-alerts') {
        setNavTab('alerts');
      } else if (route === 'financial' || route === 'financial-impact') {
        setNavTab('financial');
      } else if (route === 'analytics' || route === 'loss-analytics') {
        setNavTab('analytics');
      } else if (route === 'ai' || route === 'assistant') {
        setNavTab('ai');
      } else if (route === 'grid' || route === '') {
        setNavTab('grid');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [setNavTab]);

  // Connect to CyberQuant WebSocket and fetch initial state
  useEffect(() => {
    fetchInitialData();
    const disconnectWS = initCyberWebSocket();
    return () => {
      disconnectWS?.();
    };
  }, [fetchInitialData]);

  // Push grid state to backend every 3 seconds for risk engine correlation
  useEffect(() => {
    const interval = setInterval(() => {
      const grid = useGridStore.getState();
      const host = window.location.hostname || 'localhost';
      fetch(`http://${host}:3001/api/grid-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequencyHz: grid.telemetry.frequencyHz,
          totalGenMW: grid.telemetry.totalGenMW,
          totalDemandMW: grid.telemetry.totalDemandMW,
          generators: grid.generators,
          substations: grid.substations,
          loads: grid.loads,
          lines: grid.lines,
        }),
      }).catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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

      {/* 2. CyberQuant Navigation Strip */}
      <CyberNavBar />

      {/* 3. Main Dynamic Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {activeNavTab === 'grid' && (
          <>
            {/* Left Dispatch & Asset Sector Sidebar */}
            <LeftSidebar />

            {/* Center Viewport: Synoptic Canvas */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#050b14] overflow-hidden">
              <SynopticCanvas />
            </main>

            {/* Right Station Inspector, Dynamic Oscilloscope & Event Log */}
            <InspectorPanel />
          </>
        )}

        {activeNavTab === 'attacks' && <AttackEnginePanel />}
        {activeNavTab === 'detection' && <RiskDetectionPanel />}
        {activeNavTab === 'alerts' && <RiskAlertsPanel />}
        {activeNavTab === 'financial' && <FinancialAnalyzer />}
        {activeNavTab === 'analytics' && <LossAnalysisDashboard />}
        {activeNavTab === 'ai' && <AIChatPanel />}
      </div>
    </div>
  );
}

export default App;
