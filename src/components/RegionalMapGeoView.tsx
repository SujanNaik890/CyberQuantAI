import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGridStore } from '../store/gridStore';
import L from 'leaflet';
import { Zap, Activity, Building, Factory, Sun, Wind, Waves, Thermometer } from 'lucide-react';

// Custom DivIcon creator for Leaflet map nodes
const createCustomIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background: #070e1b;
        border: 2px solid ${color};
        box-shadow: 0 0 10px ${color}88;
        border-radius: 6px;
        padding: 2px 6px;
        color: #f8fafc;
        font-family: monospace;
        font-size: 10px;
        font-weight: bold;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
        ${label}
      </div>
    `,
    iconSize: [120, 24],
    iconAnchor: [60, 12],
  });
};

export const RegionalMapGeoView: React.FC = () => {
  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);
  const lines = useGridStore((s) => s.lines);
  const selectAsset = useGridStore((s) => s.selectAsset);

  // Center of Karnataka - Bengaluru transmission triangle
  const centerLat = 13.5;
  const centerLng = 76.5;

  const getNodeLatLng = (id: string): [number, number] | null => {
    const g = generators.find((item) => item.id === id);
    if (g) return [g.lat, g.lng];
    const s = substations.find((item) => item.id === id);
    if (s) return [s.lat, s.lng];
    const l = loads.find((item) => item.id === id);
    if (l) return [l.lat, l.lng];
    return null;
  };

  return (
    <div className="w-full h-full relative bg-[#050b14] overflow-hidden select-none">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={7}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* OpenStreetMap Dark / Cyber Basemap Tiles (No API key required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          className="map-tiles-cyber"
        />

        {/* Transmission Lines on Real Geographic Terrain */}
        {lines.map((line) => {
          const from = getNodeLatLng(line.fromNodeId);
          const to = getNodeLatLng(line.toNodeId);
          if (!from || !to) return null;

          const util = Math.abs(line.curFlowMW) / line.thermalLimitMW;
          const isOverloaded = !line.isTripped && util > 1.0;
          const color = line.isTripped
            ? '#f43f5e'
            : isOverloaded
            ? '#fb7185'
            : line.voltageKV === 400
            ? '#38bdf8'
            : line.voltageKV === 220
            ? '#818cf8'
            : '#f59e0b';

          return (
            <Polyline
              key={line.id}
              positions={[from, to]}
              pathOptions={{
                color: color,
                weight: line.voltageKV === 400 ? 3.5 : 2.5,
                dashArray: line.isTripped ? '6, 6' : undefined,
                opacity: line.isTripped ? 0.4 : 0.85,
              }}
              eventHandlers={{
                click: () => selectAsset({ type: 'line', id: line.id }),
              }}
            >
              <Popup>
                <div className="font-mono text-xs bg-[#070e1b] text-slate-100 p-1">
                  <div className="font-bold text-cyan-400">{line.name}</div>
                  <div>Rating: {line.voltageKV} kV • Thermal Limit: {line.thermalLimitMW} MW</div>
                  <div>Live Active Flow: {Math.abs(line.curFlowMW).toFixed(1)} MW ({Math.round(util * 100)}%)</div>
                  <div>Status: {line.isTripped ? 'TRIPPED (OFFLINE)' : 'ENERGIZED'}</div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Generation Hub Markers */}
        {generators.map((gen) => (
          <Marker
            key={gen.id}
            position={[gen.lat, gen.lng]}
            icon={createCustomIcon('#38bdf8', `${gen.name.split(' ')[0]} [${Math.round(gen.curMW)}MW]`)}
            eventHandlers={{
              click: () => selectAsset({ type: 'generator', id: gen.id }),
            }}
          >
            <Popup>
              <div className="font-mono text-xs bg-[#070e1b] text-slate-100 p-1">
                <div className="font-bold text-cyan-400">{gen.name}</div>
                <div className="text-slate-400">{gen.location}</div>
                <div className="text-emerald-400 font-bold mt-1">Output: {Math.round(gen.curMW)} / {gen.pMaxMW} MW</div>
                <div className="text-slate-300">
                  {gen.simMetrics.primaryParamName}: {gen.simMetrics.primaryParamValue.toFixed(1)} {gen.simMetrics.primaryParamUnit}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Bulk Substations */}
        {substations.map((sub) => (
          <Marker
            key={sub.id}
            position={[sub.lat, sub.lng]}
            icon={createCustomIcon('#818cf8', `${sub.name.split(' ')[0]} ${sub.highVoltageKV}kV`)}
            eventHandlers={{
              click: () => selectAsset({ type: 'substation', id: sub.id }),
            }}
          >
            <Popup>
              <div className="font-mono text-xs bg-[#070e1b] text-slate-100 p-1">
                <div className="font-bold text-indigo-400">{sub.name}</div>
                <div className="text-slate-400">{sub.location}</div>
                <div>High/Low: {sub.highVoltageKV}kV / {sub.lowVoltageKV}kV</div>
                <div>Throughput: {sub.activeThroughputMW} MW</div>
                <div>Distribution Transformers: {sub.distributionTransformers} Feeders</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Metropolitan Bengaluru Load Centers */}
        {loads.map((load) => (
          <Marker
            key={load.id}
            position={[load.lat, load.lng]}
            icon={createCustomIcon('#f59e0b', `${load.name.split(' ')[0]} [${Math.round(load.curDemandMW)}MW]`)}
            eventHandlers={{
              click: () => selectAsset({ type: 'load', id: load.id }),
            }}
          >
            <Popup>
              <div className="font-mono text-xs bg-[#070e1b] text-slate-100 p-1">
                <div className="font-bold text-amber-400">{load.name}</div>
                <div className="text-slate-400">{load.location}</div>
                <div>Demand: {Math.round(load.curDemandMW)} MW (Tier {load.priorityTier})</div>
                <div>Distribution Grid: {load.buildingCount} City Sub-feeders</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Overlay Badge */}
      <div className="absolute top-3 left-3 bg-[#070e1b]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e293b] font-mono text-xs text-slate-300 z-[1000] shadow-xl">
        <span className="text-cyan-400 font-bold flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> KARNATAKA - BENGALURU TRANSMISSION GRID
        </span>
        <span className="text-slate-400 text-[10.5px] block">
          Bulk 400kV/220kV PGCIL & KPTCL Corridors into BESCOM Metropolitan Hubs
        </span>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 hidden md:flex items-center gap-3 bg-[#070e1b]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e293b] font-mono text-[10.5px] text-slate-400 z-[1000]">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> 400kV Bulk
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> 220kV Ring
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 66kV BESCOM Metro
        </span>
      </div>
    </div>
  );
};
