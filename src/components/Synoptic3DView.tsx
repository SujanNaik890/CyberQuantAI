import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore } from '../store/gridStore';
import { Generator, Substation, LoadCenter, TransmissionLine } from '../engine/gridModel';

// ==================== 1. 3D GENERATOR MODELS ====================

// Nuclear Reactor (Containment Dome + Cooling Towers + Steam Plumes)
const NuclearModel: React.FC<{ gen: Generator; isSelected: boolean }> = ({ gen, isSelected }) => {
  const steamRef = useRef<THREE.Group>(null);
  const isOnline = gen.status === 'online';
  const selectAsset = useGridStore((s) => s.selectAsset);

  useFrame((state, delta) => {
    if (steamRef.current && isOnline) {
      steamRef.current.children.forEach((child, i) => {
        child.position.y += delta * (1.2 + i * 0.4);
        child.scale.addScalar(delta * 0.3);
        if (child.position.y > 6) {
          child.position.y = 2.5;
          child.scale.set(0.6, 0.6, 0.6);
        }
      });
    }
  });

  return (
    <group 
      position={[gen.x, 0, gen.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'generator', id: gen.id }); }}
    >
      {/* Containment Dome */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[2.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={isSelected ? '#38bdf8' : isOnline ? '#0284c7' : '#475569'} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Reactor Base Ring */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[2.5, 2.7, 1, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>

      {/* Cooling Tower 1 */}
      <mesh position={[-3, 2, -1.5]}>
        <cylinderGeometry args={[1.0, 1.6, 4, 24]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      {/* Cooling Tower 2 */}
      <mesh position={[-3, 2, 1.5]}>
        <cylinderGeometry args={[1.0, 1.6, 4, 24]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>

      {/* Animated Steam Clouds */}
      <group ref={steamRef}>
        <mesh position={[-3, 3.5, -1.5]}>
          <sphereGeometry args={[0.7, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
        </mesh>
        <mesh position={[-3, 4.5, 1.5]}>
          <sphereGeometry args={[0.8, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      </group>

      {/* Cyber Base Platform */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[5, 5.2, 0.2, 32]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : isOnline ? '#0369a1' : '#e11d48'} wireframe />
      </mesh>

      {/* Floating 3D HUD Label */}
      <Html position={[0, 4.8, 0]} center distanceFactor={45}>
        <div className="bg-[#070e1b]/90 border border-cyan-500/50 px-2 py-1 rounded text-center font-mono pointer-events-none select-none shadow-lg">
          <div className="text-[10px] text-cyan-300 font-bold whitespace-nowrap">{gen.name}</div>
          <div className="text-[9px] text-slate-300">
            {isOnline ? `${Math.round(gen.curMW)} MW • ${gen.simMetrics.primaryParamValue.toFixed(1)}°C` : 'OFFLINE'}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Hydroelectric Dam (Dam Wall + Reservoirs + Penstock Water Flow)
const HydroModel: React.FC<{ gen: Generator; isSelected: boolean }> = ({ gen, isSelected }) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const isOnline = gen.status === 'online';
  const selectAsset = useGridStore((s) => s.selectAsset);

  useFrame((_, delta) => {
    if (waterRef.current && isOnline) {
      waterRef.current.position.y = 1.0 + Math.sin(Date.now() / 300) * 0.15;
    }
  });

  return (
    <group 
      position={[gen.x, 0, gen.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'generator', id: gen.id }); }}
    >
      {/* Massive Concrete Dam Wall */}
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[7, 5, 2.5]} />
        <meshStandardMaterial color={isSelected ? '#38bdf8' : '#334155'} roughness={0.8} />
      </mesh>

      {/* Penstocks (3 heavy pipes) */}
      {[-1.5, 0, 1.5].map((offset, i) => (
        <mesh key={i} position={[offset, 1.8, 1.2]} rotation={[Math.PI / 5, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 3.5, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} />
        </mesh>
      ))}

      {/* Powerhouse Turbine Station */}
      <mesh position={[0, 0.8, 2.4]}>
        <boxGeometry args={[4.5, 1.6, 2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} />
      </mesh>

      {/* Tailrace Water Outlet */}
      <mesh ref={waterRef} position={[0, 0.2, 3.8]}>
        <planeGeometry args={[5, 3]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.7} roughness={0.1} />
      </mesh>

      {/* Base ring */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[5, 5.2, 0.2, 32]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : isOnline ? '#06b6d4' : '#e11d48'} wireframe />
      </mesh>

      <Html position={[0, 5.5, 0]} center distanceFactor={45}>
        <div className="bg-[#070e1b]/90 border border-cyan-500/50 px-2 py-1 rounded text-center font-mono pointer-events-none select-none shadow-lg">
          <div className="text-[10px] text-cyan-300 font-bold whitespace-nowrap">{gen.name}</div>
          <div className="text-[9px] text-slate-300">
            {isOnline ? `${Math.round(gen.curMW)} MW • ${gen.simMetrics.primaryParamValue.toFixed(0)} m³/s` : 'OFFLINE'}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Solar PV Array (Solar Panel Modules + Central Inverter Station)
const SolarModel: React.FC<{ gen: Generator; isSelected: boolean }> = ({ gen, isSelected }) => {
  const panelRef = useRef<THREE.Group>(null);
  const isOnline = gen.status === 'online';
  const selectAsset = useGridStore((s) => s.selectAsset);

  useFrame(() => {
    if (panelRef.current && isOnline) {
      // Gentle sun tracking tilt
      const tilt = Math.sin(Date.now() / 2000) * 0.15;
      panelRef.current.rotation.x = -Math.PI / 6 + tilt;
    }
  });

  return (
    <group 
      position={[gen.x, 0, gen.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'generator', id: gen.id }); }}
    >
      {/* 3x3 Grid of Solar Tracker Panels */}
      <group ref={panelRef}>
        {[-2, 0, 2].map((x) =>
          [-1.5, 0, 1.5].map((z) => (
            <group key={`${x}-${z}`} position={[x, 1.2, z]}>
              {/* Stand */}
              <mesh position={[0, -0.6, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
                <meshStandardMaterial color="#64748b" metalness={0.9} />
              </mesh>
              {/* PV Panel Face */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[1.6, 1.1, 0.06]} />
                <meshStandardMaterial 
                  color={isSelected ? '#38bdf8' : isOnline ? '#1e3a8a' : '#1e293b'} 
                  roughness={0.1} 
                  metalness={0.9} 
                />
              </mesh>
            </group>
          ))
        )}
      </group>

      {/* Central Inverter / Transformer Station */}
      <mesh position={[0, 0.7, 3.2]}>
        <boxGeometry args={[1.8, 1.4, 1.2]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>

      {/* Base ring */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[5, 5.2, 0.2, 32]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : isOnline ? '#f59e0b' : '#e11d48'} wireframe />
      </mesh>

      <Html position={[0, 4.5, 0]} center distanceFactor={45}>
        <div className="bg-[#070e1b]/90 border border-amber-500/50 px-2 py-1 rounded text-center font-mono pointer-events-none select-none shadow-lg">
          <div className="text-[10px] text-amber-300 font-bold whitespace-nowrap">{gen.name}</div>
          <div className="text-[9px] text-slate-300">
            {isOnline ? `${Math.round(gen.curMW)} MW • ${gen.simMetrics.primaryParamValue.toFixed(0)} W/m²` : 'OFFLINE'}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Wind Turbines (Tower + Nacelle + 3 Spinning Blades)
const WindModel: React.FC<{ gen: Generator; isSelected: boolean }> = ({ gen, isSelected }) => {
  const rotorRef1 = useRef<THREE.Group>(null);
  const rotorRef2 = useRef<THREE.Group>(null);
  const rotorRef3 = useRef<THREE.Group>(null);
  const isOnline = gen.status === 'online';
  const selectAsset = useGridStore((s) => s.selectAsset);

  useFrame((_, delta) => {
    const rpm = gen.simMetrics.secondaryParamValue;
    const speed = isOnline ? (rpm / 60) * Math.PI * 2 * delta * 2 : 0;
    if (rotorRef1.current) rotorRef1.current.rotation.z += speed;
    if (rotorRef2.current) rotorRef2.current.rotation.z += speed * 0.95;
    if (rotorRef3.current) rotorRef3.current.rotation.z += speed * 1.05;
  });

  const renderTurbine = (pos: [number, number, number], rotorRef: React.RefObject<THREE.Group | null>) => (
    <group position={pos}>
      {/* Tower */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.2, 0.45, 5, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Nacelle */}
      <mesh position={[0, 5, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
      </mesh>
      {/* Rotor Hub & 3 Aerodynamic Blades */}
      <group position={[0, 5, 0.9]} ref={rotorRef}>
        <mesh>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        {[0, 120, 240].map((deg) => (
          <group key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[0.18, 3.2, 0.04]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );

  return (
    <group 
      position={[gen.x, 0, gen.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'generator', id: gen.id }); }}
    >
      {renderTurbine([0, 0, 0], rotorRef1)}
      {renderTurbine([-2.5, 0, -2], rotorRef2)}
      {renderTurbine([2.5, 0, -1.8], rotorRef3)}

      {/* Cyber Platform */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[5, 5.2, 0.2, 32]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : isOnline ? '#10b981' : '#e11d48'} wireframe />
      </mesh>

      <Html position={[0, 6.5, 0]} center distanceFactor={45}>
        <div className="bg-[#070e1b]/90 border border-emerald-500/50 px-2 py-1 rounded text-center font-mono pointer-events-none select-none shadow-lg">
          <div className="text-[10px] text-emerald-300 font-bold whitespace-nowrap">{gen.name}</div>
          <div className="text-[9px] text-slate-300">
            {isOnline ? `${Math.round(gen.curMW)} MW • ${gen.simMetrics.primaryParamValue.toFixed(1)} m/s` : 'OFFLINE'}
          </div>
        </div>
      </Html>
    </group>
  );
};

// ==================== 2. SUBSTATIONS & LOADS 3D ====================

const SubstationModel: React.FC<{ sub: Substation; isSelected: boolean }> = ({ sub, isSelected }) => {
  const selectAsset = useGridStore((s) => s.selectAsset);

  return (
    <group 
      position={[sub.x, 0, sub.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'substation', id: sub.id }); }}
    >
      {/* Heavy Transformer Banks */}
      <mesh position={[-1, 1, 0]}>
        <boxGeometry args={[1.5, 2, 2.2]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>
      <mesh position={[1, 1, 0]}>
        <boxGeometry args={[1.5, 2, 2.2]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* High-Voltage Bushings & Insulators */}
      {[-1.2, 0, 1.2].map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <cylinderGeometry args={[0.15, 0.25, 1.2, 12]} />
          <meshStandardMaterial color="#818cf8" metalness={0.9} />
        </mesh>
      ))}

      {/* Perimeter Ground Grid */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[5, 0.1, 4]} />
        <meshBasicMaterial color={isSelected ? '#818cf8' : '#334155'} wireframe />
      </mesh>

      <Html position={[0, 3.8, 0]} center distanceFactor={45}>
        <div className="bg-[#070e1b]/90 border border-indigo-500/50 px-2 py-0.5 rounded text-center font-mono pointer-events-none select-none shadow-lg">
          <div className="text-[10px] text-indigo-300 font-bold whitespace-nowrap">{sub.name}</div>
          <div className="text-[9px] text-slate-300">{sub.highVoltageKV}kV • {sub.activeThroughputMW}MW</div>
        </div>
      </Html>
    </group>
  );
};

const LoadModel: React.FC<{ load: LoadCenter; isSelected: boolean }> = ({ load, isSelected }) => {
  const selectAsset = useGridStore((s) => s.selectAsset);

  return (
    <group 
      position={[load.x, 0, load.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'load', id: load.id }); }}
    >
      {/* Industrial / City Building Blocks */}
      <mesh position={[-1, 1.5, -0.8]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshStandardMaterial color={isSelected ? '#f59e0b' : '#1e293b'} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[1.2, 2.5, 0.5]}>
        <boxGeometry args={[1.8, 5, 2.2]} />
        <meshStandardMaterial color={isSelected ? '#f59e0b' : '#334155'} metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[5, 0.1, 5]} />
        <meshBasicMaterial color={load.isShed ? '#f43f5e' : '#f59e0b'} wireframe />
      </mesh>

      <Html position={[0, 4.5, 0]} center distanceFactor={45}>
        <div className="bg-[#070e1b]/90 border border-amber-500/50 px-2 py-0.5 rounded text-center font-mono pointer-events-none select-none shadow-lg">
          <div className="text-[10px] text-amber-300 font-bold whitespace-nowrap">{load.name}</div>
          <div className="text-[9px] text-slate-300">{load.isShed ? 'SHED' : `${Math.round(load.curDemandMW)} MW (Tier ${load.priorityTier})`}</div>
        </div>
      </Html>
    </group>
  );
};

// ==================== 3. 3D TRANSMISSION LINES & FLOW PARTICLES ====================

const Transmission3D: React.FC<{ line: TransmissionLine; fromCoord: [number, number, number]; toCoord: [number, number, number] }> = ({
  line,
  fromCoord,
  toCoord,
}) => {
  const selectAsset = useGridStore((s) => s.selectAsset);
  const selectedAsset = useGridStore((s) => s.selectedAsset);
  const isSelected = selectedAsset?.type === 'line' && selectedAsset.id === line.id;

  const points = useMemo(() => {
    const start = new THREE.Vector3(...fromCoord);
    const end = new THREE.Vector3(...toCoord);
    // Add realistic catenary sag or overhead line height
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    mid.y += 3.5; // Elevate transmission lines
    start.y += 2.0;
    end.y += 2.0;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(24);
  }, [fromCoord, toCoord]);

  const util = Math.abs(line.curFlowMW) / line.thermalLimitMW;
  const isOverloaded = !line.isTripped && util > 1.0;
  const lineColor = line.isTripped
    ? '#881337'
    : isOverloaded
    ? '#f43f5e'
    : util > 0.8
    ? '#f59e0b'
    : line.voltageKV === 500
    ? '#38bdf8'
    : '#818cf8';

  return (
    <group onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'line', id: line.id }); }}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={lineColor} linewidth={isSelected ? 3 : 1.5} />
      </line>
    </group>
  );
};

// ==================== 4. MAIN 3D SCENE ORCHESTRATOR ====================

export const Synoptic3DView: React.FC = () => {
  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);
  const lines = useGridStore((s) => s.lines);
  const selectedAsset = useGridStore((s) => s.selectedAsset);

  const getNodePos = (id: string): [number, number, number] => {
    const g = generators.find((item) => item.id === id);
    if (g) return [g.x, 0, g.y];
    const s = substations.find((item) => item.id === id);
    if (s) return [s.x, 0, s.y];
    const l = loads.find((item) => item.id === id);
    if (l) return [l.x, 0, l.y];
    return [0, 0, 0];
  };

  return (
    <div className="w-full h-full relative bg-[#050b14] overflow-hidden">
      <Canvas
        camera={{ position: [0, 65, 75], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#050b14']} />
        
        {/* Cyber Grid Lighting */}
        <ambientLight intensity={0.65} />
        <directionalLight position={[40, 60, 40]} intensity={1.2} castShadow />
        <pointLight position={[0, 20, 0]} intensity={2.0} color="#38bdf8" distance={90} />

        {/* Orbit Controls with dampening */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={20}
          maxDistance={180}
        />

        {/* Ground Blueprint Grid */}
        <gridHelper args={[160, 40, '#0284c7', '#0f172a']} position={[0, -0.05, 0]} />

        {/* Generators with specialized 3D models */}
        {generators.map((gen) => {
          const isSelected = selectedAsset?.type === 'generator' && selectedAsset.id === gen.id;
          if (gen.type === 'nuclear') return <NuclearModel key={gen.id} gen={gen} isSelected={isSelected} />;
          if (gen.type === 'hydro') return <HydroModel key={gen.id} gen={gen} isSelected={isSelected} />;
          if (gen.type === 'solar_pv') return <SolarModel key={gen.id} gen={gen} isSelected={isSelected} />;
          if (gen.type === 'wind') return <WindModel key={gen.id} gen={gen} isSelected={isSelected} />;
          return null;
        })}

        {/* Substations */}
        {substations.map((sub) => (
          <SubstationModel
            key={sub.id}
            sub={sub}
            isSelected={selectedAsset?.type === 'substation' && selectedAsset.id === sub.id}
          />
        ))}

        {/* Load Centers */}
        {loads.map((load) => (
          <LoadModel
            key={load.id}
            load={load}
            isSelected={selectedAsset?.type === 'load' && selectedAsset.id === load.id}
          />
        ))}

        {/* Transmission Lines 3D */}
        {lines.map((line) => (
          <Transmission3D
            key={line.id}
            line={line}
            fromCoord={getNodePos(line.fromNodeId)}
            toCoord={getNodePos(line.toNodeId)}
          />
        ))}
      </Canvas>
    </div>
  );
};
