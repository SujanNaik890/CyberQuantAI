import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore } from '../store/gridStore';
import { Generator, Substation, LoadCenter, TransmissionLine } from '../engine/gridModel';
import { MapPin, Zap, Activity, Thermometer, Waves, Sun, Wind, Building, Factory } from 'lucide-react';

// ==================== 1. 3D GENERATOR MODELS (LARGER & VISIBLE) ====================

// Nuclear Reactor (Kaiga NPCIL)
const NuclearModel: React.FC<{
  gen: Generator;
  isSelected: boolean;
  onHover: (info: any) => void;
  onLeave: () => void;
}> = ({ gen, isSelected, onHover, onLeave }) => {
  const steamRef = useRef<THREE.Group>(null);
  const isOnline = gen.status === 'online';
  const selectAsset = useGridStore((s) => s.selectAsset);

  useFrame((_, delta) => {
    if (steamRef.current && isOnline) {
      steamRef.current.children.forEach((child, i) => {
        child.position.y += delta * (2.0 + i * 0.8);
        child.scale.addScalar(delta * 0.5);
        if (child.position.y > 12) {
          child.position.y = 5.0;
          child.scale.set(1.0, 1.0, 1.0);
        }
      });
    }
  });

  return (
    <group 
      position={[gen.x, 0, gen.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'generator', id: gen.id }); }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover({
          name: gen.name,
          type: 'Nuclear Power Station',
          id: gen.id,
          location: gen.location,
          voltage: `${gen.voltageRating} kV`,
          output: `${Math.round(gen.curMW)} / ${gen.pMaxMW} MW`,
          status: gen.status.toUpperCase(),
          param1: `${gen.simMetrics.primaryParamName}: ${gen.simMetrics.primaryParamValue.toFixed(1)} ${gen.simMetrics.primaryParamUnit}`,
          param2: `${gen.simMetrics.secondaryParamName}: ${gen.simMetrics.secondaryParamValue.toFixed(1)} ${gen.simMetrics.secondaryParamUnit}`,
        });
      }}
      onPointerOut={() => onLeave()}
    >
      {/* Reactor Containment Dome (Double scale) */}
      <mesh position={[0, 4.0, 0]} castShadow>
        <sphereGeometry args={[5.0, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color={isSelected ? '#38bdf8' : isOnline ? '#0ea5e9' : '#64748b'} 
          roughness={0.2} 
          metalness={0.8} 
          emissive={isSelected ? '#0284c7' : isOnline ? '#0369a1' : '#000000'}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Reactor Heavy Concrete Base */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[5.6, 6.0, 3.0, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>

      {/* Hyperbolic Cooling Tower 1 */}
      <mesh position={[-7, 5, -3]}>
        <cylinderGeometry args={[2.2, 3.8, 10, 24]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>
      {/* Hyperbolic Cooling Tower 2 */}
      <mesh position={[-7, 5, 3]}>
        <cylinderGeometry args={[2.2, 3.8, 10, 24]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>

      {/* Animated Cooling Plumes */}
      <group ref={steamRef}>
        <mesh position={[-7, 8, -3]}>
          <sphereGeometry args={[1.6, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
        </mesh>
        <mesh position={[-7, 10, 3]}>
          <sphereGeometry args={[1.8, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Illuminated Cyber Boundary Pedestal */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[11, 11.5, 0.4, 32]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : isOnline ? '#38bdf8' : '#f43f5e'} wireframe />
      </mesh>

      {/* High-visibility Title Pin */}
      <Html position={[0, 11, 0]} center distanceFactor={70}>
        <div className="bg-[#070e1b]/95 border-2 border-cyan-400 px-3 py-1.5 rounded-lg text-center font-mono pointer-events-none select-none shadow-[0_0_15px_rgba(56,189,248,0.5)]">
          <div className="text-xs text-cyan-300 font-bold whitespace-nowrap flex items-center gap-1 justify-center">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> {gen.name}
          </div>
          <div className="text-[10px] text-slate-300 font-semibold">
            {isOnline ? `${Math.round(gen.curMW)} MW • 400kV Kaiga` : 'OFFLINE'}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Hydro Dam (Sharavathi KPCL)
const HydroModel: React.FC<{
  gen: Generator;
  isSelected: boolean;
  onHover: (info: any) => void;
  onLeave: () => void;
}> = ({ gen, isSelected, onHover, onLeave }) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const isOnline = gen.status === 'online';
  const selectAsset = useGridStore((s) => s.selectAsset);

  useFrame(() => {
    if (waterRef.current && isOnline) {
      waterRef.current.position.y = 2.0 + Math.sin(Date.now() / 250) * 0.3;
    }
  });

  return (
    <group 
      position={[gen.x, 0, gen.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'generator', id: gen.id }); }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover({
          name: gen.name,
          type: 'Hydroelectric Generating Station',
          id: gen.id,
          location: gen.location,
          voltage: `${gen.voltageRating} kV`,
          output: `${Math.round(gen.curMW)} / ${gen.pMaxMW} MW`,
          status: gen.status.toUpperCase(),
          param1: `${gen.simMetrics.primaryParamName}: ${gen.simMetrics.primaryParamValue.toFixed(1)} ${gen.simMetrics.primaryParamUnit}`,
          param2: `${gen.simMetrics.secondaryParamName}: ${gen.simMetrics.secondaryParamValue.toFixed(1)} ${gen.simMetrics.secondaryParamUnit}`,
        });
      }}
      onPointerOut={() => onLeave()}
    >
      {/* High-relief Concrete Gravity Dam */}
      <mesh position={[0, 5.0, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[16, 10, 5.5]} />
        <meshStandardMaterial color={isSelected ? '#38bdf8' : '#475569'} roughness={0.7} />
      </mesh>

      {/* 4 Heavy High-Pressure Steel Penstocks */}
      {[-4.5, -1.5, 1.5, 4.5].map((offset, i) => (
        <mesh key={i} position={[offset, 4.0, 2.5]} rotation={[Math.PI / 4.5, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 8.5, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Turbine Powerhouse */}
      <mesh position={[0, 2.0, 5.5]}>
        <boxGeometry args={[11, 4.0, 4.5]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>

      {/* Undulating Tailrace River */}
      <mesh ref={waterRef} position={[0, 0.5, 9.0]}>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#0284c7" transparent opacity={0.8} roughness={0.1} />
      </mesh>

      {/* Base platform */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[12, 12.5, 0.4, 32]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : '#06b6d4'} wireframe />
      </mesh>

      <Html position={[0, 12, 0]} center distanceFactor={70}>
        <div className="bg-[#070e1b]/95 border-2 border-cyan-400 px-3 py-1.5 rounded-lg text-center font-mono pointer-events-none select-none shadow-[0_0_15px_rgba(6,182,212,0.5)]">
          <div className="text-xs text-cyan-300 font-bold whitespace-nowrap flex items-center gap-1 justify-center">
            <Waves className="w-3.5 h-3.5 text-cyan-400" /> {gen.name}
          </div>
          <div className="text-[10px] text-slate-300 font-semibold">
            {isOnline ? `${Math.round(gen.curMW)} MW • Sharavathi Reservoir` : 'OFFLINE'}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Solar Mega Park (Pavagada 2GW)
const SolarModel: React.FC<{
  gen: Generator;
  isSelected: boolean;
  onHover: (info: any) => void;
  onLeave: () => void;
}> = ({ gen, isSelected, onHover, onLeave }) => {
  const panelRef = useRef<THREE.Group>(null);
  const isOnline = gen.status === 'online';
  const selectAsset = useGridStore((s) => s.selectAsset);

  useFrame(() => {
    if (panelRef.current && isOnline) {
      const tilt = Math.sin(Date.now() / 2000) * 0.15;
      panelRef.current.rotation.x = -Math.PI / 6 + tilt;
    }
  });

  return (
    <group 
      position={[gen.x, 0, gen.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'generator', id: gen.id }); }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover({
          name: gen.name,
          type: 'Mega Solar Photovoltaic Park',
          id: gen.id,
          location: gen.location,
          voltage: `${gen.voltageRating} kV`,
          output: `${Math.round(gen.curMW)} / ${gen.pMaxMW} MW`,
          status: gen.status.toUpperCase(),
          param1: `${gen.simMetrics.primaryParamName}: ${gen.simMetrics.primaryParamValue.toFixed(1)} ${gen.simMetrics.primaryParamUnit}`,
          param2: `${gen.simMetrics.secondaryParamName}: ${gen.simMetrics.secondaryParamValue.toFixed(1)} ${gen.simMetrics.secondaryParamUnit}`,
        });
      }}
      onPointerOut={() => onLeave()}
    >
      <group ref={panelRef}>
        {[-5.0, -1.8, 1.8, 5.0].map((x) =>
          [-3.5, 0, 3.5].map((z) => (
            <group key={`${x}-${z}`} position={[x, 2.5, z]}>
              <mesh position={[0, -1.2, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 2.4, 8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[3.2, 2.2, 0.1]} />
                <meshStandardMaterial 
                  color={isSelected ? '#38bdf8' : isOnline ? '#1d4ed8' : '#334155'} 
                  roughness={0.1} 
                  metalness={0.95} 
                  emissive={isOnline ? '#1e3a8a' : '#000000'}
                  emissiveIntensity={0.5}
                />
              </mesh>
            </group>
          ))
        )}
      </group>

      {/* Central High-Power Inverter Stations */}
      <mesh position={[0, 1.5, 7.0]}>
        <boxGeometry args={[5.0, 3.0, 2.8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[12, 12.5, 0.4, 32]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : '#f59e0b'} wireframe />
      </mesh>

      <Html position={[0, 11, 0]} center distanceFactor={70}>
        <div className="bg-[#070e1b]/95 border-2 border-amber-400 px-3 py-1.5 rounded-lg text-center font-mono pointer-events-none select-none shadow-[0_0_15px_rgba(245,158,11,0.5)]">
          <div className="text-xs text-amber-300 font-bold whitespace-nowrap flex items-center gap-1 justify-center">
            <Sun className="w-3.5 h-3.5 text-amber-400" /> {gen.name}
          </div>
          <div className="text-[10px] text-slate-300 font-semibold">
            {isOnline ? `${Math.round(gen.curMW)} MW • Shakti Sthala 2GW` : 'OFFLINE'}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Wind Turbines (Kappatagudda Gadag)
const WindModel: React.FC<{
  gen: Generator;
  isSelected: boolean;
  onHover: (info: any) => void;
  onLeave: () => void;
}> = ({ gen, isSelected, onHover, onLeave }) => {
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
      <mesh position={[0, 6.0, 0]}>
        <cylinderGeometry args={[0.35, 0.8, 12, 16]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 12.0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.6, 1.8, 8, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
      </mesh>
      <group position={[0, 12.0, 1.8]} ref={rotorRef}>
        <mesh>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        {[0, 120, 240].map((deg) => (
          <group key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
            <mesh position={[0, 3.8, 0]}>
              <boxGeometry args={[0.35, 7.5, 0.08]} />
              <meshStandardMaterial color="#ffffff" metalness={0.4} />
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
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover({
          name: gen.name,
          type: 'Plateau Wind Turbine Farm',
          id: gen.id,
          location: gen.location,
          voltage: `${gen.voltageRating} kV`,
          output: `${Math.round(gen.curMW)} / ${gen.pMaxMW} MW`,
          status: gen.status.toUpperCase(),
          param1: `${gen.simMetrics.primaryParamName}: ${gen.simMetrics.primaryParamValue.toFixed(1)} ${gen.simMetrics.primaryParamUnit}`,
          param2: `${gen.simMetrics.secondaryParamName}: ${gen.simMetrics.secondaryParamValue.toFixed(1)} ${gen.simMetrics.secondaryParamUnit}`,
        });
      }}
      onPointerOut={() => onLeave()}
    >
      {renderTurbine([0, 0, 0], rotorRef1)}
      {renderTurbine([-5.5, 0, -4], rotorRef2)}
      {renderTurbine([5.5, 0, -3.5], rotorRef3)}

      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[12, 12.5, 0.4, 32]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : '#10b981'} wireframe />
      </mesh>

      <Html position={[0, 16, 0]} center distanceFactor={70}>
        <div className="bg-[#070e1b]/95 border-2 border-emerald-400 px-3 py-1.5 rounded-lg text-center font-mono pointer-events-none select-none shadow-[0_0_15px_rgba(16,185,129,0.5)]">
          <div className="text-xs text-emerald-300 font-bold whitespace-nowrap flex items-center gap-1 justify-center">
            <Wind className="w-3.5 h-3.5 text-emerald-400" /> {gen.name}
          </div>
          <div className="text-[10px] text-slate-300 font-semibold">
            {isOnline ? `${Math.round(gen.curMW)} MW • Kappatagudda Ridge` : 'OFFLINE'}
          </div>
        </div>
      </Html>
    </group>
  );
};

// ==================== 2. SUBSTATIONS WITH BULK STEP-DOWN TRANSFORMERS ====================

const SubstationModel: React.FC<{
  sub: Substation;
  isSelected: boolean;
  onHover: (info: any) => void;
  onLeave: () => void;
}> = ({ sub, isSelected, onHover, onLeave }) => {
  const selectAsset = useGridStore((s) => s.selectAsset);

  return (
    <group 
      position={[sub.x, 0, sub.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'substation', id: sub.id }); }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover({
          name: sub.name,
          type: 'Transmission Substation & Step-Down Hub',
          id: sub.id,
          location: sub.location,
          voltage: `${sub.highVoltageKV}kV / ${sub.lowVoltageKV}kV`,
          throughput: `${sub.activeThroughputMW} MW`,
          feeders: `${sub.distributionTransformers} City Step-Down Transformers`,
          status: sub.busStatus.toUpperCase(),
        });
      }}
      onPointerOut={() => onLeave()}
    >
      {/* 400kV Bulk Autotransformers */}
      <mesh position={[-2.5, 2.5, 0]}>
        <boxGeometry args={[3.5, 5.0, 4.5]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>
      <mesh position={[2.5, 2.5, 0]}>
        <boxGeometry args={[3.5, 5.0, 4.5]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Ceramic Bushings & Lightning Arrestors */}
      {[-3.0, -1.0, 1.0, 3.0].map((x) => (
        <mesh key={x} position={[x, 5.8, 0]}>
          <cylinderGeometry args={[0.25, 0.5, 2.8, 12]} />
          <meshStandardMaterial color="#818cf8" metalness={0.9} />
        </mesh>
      ))}

      {/* 66kV/11kV Distribution Switchgear Control House */}
      <mesh position={[0, 1.5, 5.0]}>
        <boxGeometry args={[9.0, 3.0, 3.5]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>

      {/* Perimeter Grounding Grid */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[13, 0.2, 12]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : '#818cf8'} wireframe />
      </mesh>

      <Html position={[0, 9.5, 0]} center distanceFactor={70}>
        <div className="bg-[#070e1b]/95 border-2 border-indigo-400 px-3 py-1.5 rounded-lg text-center font-mono pointer-events-none select-none shadow-[0_0_15px_rgba(129,140,248,0.5)]">
          <div className="text-xs text-indigo-300 font-bold whitespace-nowrap">{sub.name}</div>
          <div className="text-[10px] text-slate-300 font-semibold">
            {sub.highVoltageKV}kV Bulk Hub • {sub.activeThroughputMW}MW
          </div>
        </div>
      </Html>
    </group>
  );
};

// ==================== 3. GIRCITY PROCEDURAL BENGALURU SKYLINE ====================

const GitCityBengaluruCluster: React.FC<{
  load: LoadCenter;
  isSelected: boolean;
  onHover: (info: any) => void;
  onLeave: () => void;
}> = ({ load, isSelected, onHover, onLeave }) => {
  const selectAsset = useGridStore((s) => s.selectAsset);

  const buildings = useMemo(() => {
    const list: { x: number; z: number; width: number; depth: number; height: number; color: string }[] = [];
    const count = load.buildingCount;
    const rngSeed = load.id.length * 17;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 * 4;
      const radius = 2.0 + (i % 6) * 2.2;
      const bx = Math.cos(angle) * radius + ((i % 3) - 1) * 1.4;
      const bz = Math.sin(angle) * radius + (((i + 1) % 3) - 1) * 1.4;

      const baseH = (load.curDemandMW / 75);
      const randFactor = (((i * rngSeed) % 100) / 100);
      const height = Math.max(5.0, baseH * (0.8 + randFactor * 2.2));
      const width = 1.6 + ((i % 4) * 0.5);
      const depth = 1.6 + (((i + 2) % 4) * 0.5);

      const isWindowLit = !load.isShed && (i % 3 !== 0);
      const color = load.isShed
        ? '#334155'
        : isWindowLit
        ? i % 4 === 0 ? '#38bdf8' : '#f59e0b'
        : '#1e293b';

      list.push({ x: bx, z: bz, width, depth, height, color });
    }
    return list;
  }, [load.id, load.buildingCount, load.curDemandMW, load.isShed]);

  return (
    <group 
      position={[load.x, 0, load.y]} 
      onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'load', id: load.id }); }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover({
          name: load.name,
          type: 'Metropolitan Demand Zone (BESCOM)',
          id: load.id,
          location: load.location,
          demand: `${Math.round(load.curDemandMW)} MW (Base: ${load.baseDemandMW} MW)`,
          tier: `Tier ${load.priorityTier} Priority`,
          density: `${load.buildingCount} Major Commercial/Residential High-Rises`,
          status: load.isShed ? 'SHED (BROWNOUT)' : 'ONLINE / ENERGIZED',
        });
      }}
      onPointerOut={() => onLeave()}
    >
      {/* Procedural High-Rise Towers */}
      {buildings.map((b, idx) => (
        <group key={idx} position={[b.x, b.height / 2, b.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.width, b.height, b.depth]} />
            <meshStandardMaterial 
              color={isSelected ? '#38bdf8' : b.color} 
              metalness={0.8} 
              roughness={0.2} 
            />
          </mesh>
          {!load.isShed && (
            <mesh position={[0, 0, b.depth / 2 + 0.03]}>
              <planeGeometry args={[b.width * 0.85, b.height * 0.75]} />
              <meshBasicMaterial color="#fef08a" transparent opacity={0.4} />
            </mesh>
          )}
        </group>
      ))}

      {/* Urban Substation Ring Base */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[15, 15.5, 0.2, 32]} />
        <meshBasicMaterial color={load.isShed ? '#f43f5e' : '#f59e0b'} wireframe />
      </mesh>

      <Html position={[0, 20, 0]} center distanceFactor={70}>
        <div className="bg-[#070e1b]/95 border-2 border-amber-400 px-3 py-1.5 rounded-lg text-center font-mono pointer-events-none select-none shadow-[0_0_15px_rgba(245,158,11,0.5)]">
          <div className="text-xs text-amber-300 font-bold whitespace-nowrap flex items-center gap-1 justify-center">
            <Building className="w-3.5 h-3.5 text-amber-400" /> {load.name}
          </div>
          <div className="text-[10px] text-slate-300 font-semibold">
            {load.isShed ? 'SHED' : `${Math.round(load.curDemandMW)} MW • Tier ${load.priorityTier} • ${load.buildingCount} Towers`}
          </div>
        </div>
      </Html>
    </group>
  );
};

// ==================== 4. 3D TRANSMISSION CORRIDORS ====================

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
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += line.voltageKV === 400 ? 10.0 : 6.0;
    start.y += 4.0;
    end.y += 4.0;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(32);
  }, [fromCoord, toCoord, line.voltageKV]);

  const util = Math.abs(line.curFlowMW) / line.thermalLimitMW;
  const isOverloaded = !line.isTripped && util > 1.0;
  const lineColor = line.isTripped
    ? '#881337'
    : isOverloaded
    ? '#f43f5e'
    : util > 0.8
    ? '#f59e0b'
    : line.voltageKV === 400
    ? '#38bdf8'
    : line.voltageKV === 220
    ? '#818cf8'
    : '#f59e0b';

  return (
    <group onClick={(e) => { e.stopPropagation(); selectAsset({ type: 'line', id: line.id }); }}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={lineColor} linewidth={isSelected ? 5 : 2.5} />
      </line>
    </group>
  );
};

// ==================== 5. SCENE ROOT WITH HOVER POPUP ====================

export const Synoptic3DView: React.FC = () => {
  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);
  const lines = useGridStore((s) => s.lines);
  const selectedAsset = useGridStore((s) => s.selectedAsset);

  // Hover Pop-up State
  const [hoverData, setHoverData] = useState<any | null>(null);

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
      {/* Real-time Hover Detail Card Popup */}
      {hoverData && (
        <div className="absolute top-14 left-4 z-[1002] bg-[#070e1b]/95 border-2 border-cyan-400 p-3.5 rounded-xl font-mono text-xs shadow-[0_0_25px_rgba(56,189,248,0.4)] backdrop-blur-md max-w-sm pointer-events-none transition-all">
          <div className="flex items-center gap-2 mb-1.5 border-b border-[#1e293b] pb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-slate-100 text-sm">{hoverData.name}</span>
          </div>
          <div className="text-[11px] text-cyan-300 font-semibold mb-2">{hoverData.type}</div>
          
          <div className="space-y-1 text-slate-300 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Location / Address: <strong className="text-slate-100">{hoverData.location}</strong></span>
            </div>
            {hoverData.voltage && <div>Bus Rating: <strong className="text-indigo-300">{hoverData.voltage}</strong></div>}
            {hoverData.output && <div>Active Generation: <strong className="text-emerald-400">{hoverData.output}</strong></div>}
            {hoverData.throughput && <div>Active Throughput: <strong className="text-indigo-400">{hoverData.throughput}</strong></div>}
            {hoverData.demand && <div>Metropolitan Demand: <strong className="text-amber-400">{hoverData.demand}</strong></div>}
            {hoverData.feeders && <div>Step-Down Units: <strong className="text-slate-100">{hoverData.feeders}</strong></div>}
            {hoverData.density && <div>Grid Density: <strong className="text-slate-100">{hoverData.density}</strong></div>}
            {hoverData.param1 && <div>{hoverData.param1}</div>}
            {hoverData.param2 && <div>{hoverData.param2}</div>}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 italic">Click model to lock into Station Inspector panel</div>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 140, 190], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#050b14']} />
        
        <ambientLight intensity={0.9} />
        <directionalLight position={[70, 120, 70]} intensity={1.8} castShadow />
        <pointLight position={[0, 40, 0]} intensity={3.5} color="#38bdf8" distance={250} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={30}
          maxDistance={350}
        />

        <gridHelper args={[340, 68, '#0284c7', '#0f172a']} position={[0, -0.05, 0]} />

        {/* 3D Power Plants */}
        {generators.map((gen) => {
          const isSelected = selectedAsset?.type === 'generator' && selectedAsset.id === gen.id;
          if (gen.type === 'nuclear') return <NuclearModel key={gen.id} gen={gen} isSelected={isSelected} onHover={setHoverData} onLeave={() => setHoverData(null)} />;
          if (gen.type === 'hydro') return <HydroModel key={gen.id} gen={gen} isSelected={isSelected} onHover={setHoverData} onLeave={() => setHoverData(null)} />;
          if (gen.type === 'solar_pv') return <SolarModel key={gen.id} gen={gen} isSelected={isSelected} onHover={setHoverData} onLeave={() => setHoverData(null)} />;
          if (gen.type === 'wind') return <WindModel key={gen.id} gen={gen} isSelected={isSelected} onHover={setHoverData} onLeave={() => setHoverData(null)} />;
          return null;
        })}

        {/* 3D Substations */}
        {substations.map((sub) => (
          <SubstationModel
            key={sub.id}
            sub={sub}
            isSelected={selectedAsset?.type === 'substation' && selectedAsset.id === sub.id}
            onHover={setHoverData}
            onLeave={() => setHoverData(null)}
          />
        ))}

        {/* Bengaluru City 3D Skyline */}
        {loads.map((load) => (
          <GitCityBengaluruCluster
            key={load.id}
            load={load}
            isSelected={selectedAsset?.type === 'load' && selectedAsset.id === load.id}
            onHover={setHoverData}
            onLeave={() => setHoverData(null)}
          />
        ))}

        {/* 3D Transmission Lines */}
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
