import React, { useState } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { 
  DollarSign, 
  TrendingDown, 
  AlertCircle, 
  Zap, 
  Clock, 
  Calculator, 
  Layers, 
  FileText, 
  ChevronRight,
  Info
} from 'lucide-react';
import { FinancialIncident } from '../../engine/cyberModels';

export const FinancialAnalyzer: React.FC = () => {
  const incidents = useCyberStore((s) => s.incidents);
  const selectedIncident = useCyberStore((s) => s.selectedIncident);
  const selectIncident = useCyberStore((s) => s.selectIncident);

  const activeIncident = selectedIncident || incidents[0];

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#050b14] font-mono text-xs select-none">
      {/* Incident List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-[#1e293b] flex flex-col min-w-0 bg-[#070e1b]">
        <div className="p-3 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200">Incident Loss Registry</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
            {incidents.length} Projections
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]/60">
          {incidents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No financial impact projections registered.
            </div>
          ) : (
            incidents.map((inc) => {
              const isSelected = activeIncident?.incidentId === inc.incidentId;
              return (
                <div
                  key={inc.incidentId}
                  onClick={() => selectIncident(inc)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-950/30 border-l-4 border-emerald-400'
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-200">{inc.targetAssetName}</span>
                    <span className="text-emerald-400 font-extrabold text-xs">
                      {formatINR(inc.totalEstimatedLoss)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>{inc.attackCategory.replace(/_/g, ' ')}</span>
                    <span>{inc.assumedOutageDurationHrs}h outage</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Financial Details & Transparent Formula Breakdown */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[#050b14]">
        {activeIncident ? (
          <>
            {/* Disclaimer & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                    Actuarial Cyber Risk Modeling
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40">
                    ESTIMATED PROJECTION
                  </span>
                </div>
                <h1 className="text-base md:text-lg font-bold text-slate-100">
                  {activeIncident.targetAssetName}
                </h1>
                <p className="text-[11px] text-slate-400">
                  Incident ID: {activeIncident.incidentId} • Linked to Alert: {activeIncident.alertId}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/50 text-right">
                <span className="text-[10px] text-slate-400 uppercase">Total Estimated Incident Loss</span>
                <div className="text-2xl md:text-3xl font-extrabold text-emerald-300">
                  {formatINR(activeIncident.totalEstimatedLoss)}
                </div>
                <span className="text-[10px] text-slate-400">
                  Confidence Range: {formatINR(activeIncident.minExpectedLoss)} – {formatINR(activeIncident.maxExpectedLoss)}
                </span>
              </div>
            </div>

            {/* 4 Cost Components Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Replacement Electricity Cost */}
              <div className="p-3.5 rounded-xl bg-[#0c1527] border border-[#1e293b] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">1. Replacement Power</span>
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg font-bold text-cyan-300">
                  {formatINR(activeIncident.replacementElectricityCost)}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Affected gen × {activeIncident.assumedOutageDurationHrs}h × ₹{(activeIncident.replacementCostPerKWh - activeIncident.normalCostPerKWh).toFixed(2)}/kWh net spread.
                </p>
              </div>

              {/* 2. Unserved Electricity Impact */}
              <div className="p-3.5 rounded-xl bg-[#0c1527] border border-[#1e293b] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">2. Unserved Energy Impact</span>
                  <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-amber-300">
                  {formatINR(activeIncident.unservedElectricityImpact)}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Value of Lost Load (VoLL) @ ₹{activeIncident.economicImpactPerMWh.toLocaleString()}/MWh economic impact.
                </p>
              </div>

              {/* 3. Recovery Expenses */}
              <div className="p-3.5 rounded-xl bg-[#0c1527] border border-[#1e293b] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">3. Recovery & Forensics</span>
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-lg font-bold text-indigo-300">
                  {formatINR(activeIncident.recoveryExpenses)}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  OT firmware reflash, DFIR forensic triage, and RTU isolation crews.
                </p>
              </div>

              {/* 4. Operational Expenses */}
              <div className="p-3.5 rounded-xl bg-[#0c1527] border border-[#1e293b] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">4. Operational & Regulatory</span>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-lg font-bold text-rose-300">
                  {formatINR(activeIncident.operationalExpenses)}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Emergency staffing, grid reconfiguration, and compliance penalty reserve.
                </p>
              </div>
            </div>

            {/* Annualized Expected Loss (ALE) vs Single Incident Loss */}
            <div className="p-4 rounded-xl bg-[#0c1527] border border-cyan-500/30 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-bold">Annual Loss Event Frequency (ALEF)</span>
                <div className="text-xl font-bold text-slate-100 mt-1">
                  {activeIncident.annualLossEventFrequency} <span className="text-xs text-slate-400">events/yr</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Based on global OT energy sector threat frequency models.</p>
              </div>

              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-bold">Single Incident Loss Expectancy (SLE)</span>
                <div className="text-xl font-bold text-slate-100 mt-1">
                  {formatINR(activeIncident.totalEstimatedLoss)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Direct loss consequence per successful cyber strike.</p>
              </div>

              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Annualized Loss Expectancy (ALE)</span>
                <div className="text-xl font-bold text-emerald-300 mt-1">
                  {formatINR(activeIncident.annualizedExpectedLoss)}/yr
                </div>
                <p className="text-[10px] text-slate-400 mt-1">ALE = Annual Event Frequency × Single Incident Loss Magnitude.</p>
              </div>
            </div>

            {/* Transparent Calculation Formula & Assumptions */}
            <div className="p-4 rounded-xl bg-[#070e1b] border border-[#1e293b] space-y-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Calculator className="w-4 h-4" />
                <span className="font-bold text-slate-200">Reproducible Calculation Methodology & Actuarial Parameters</span>
              </div>

              <div className="text-[11px] text-slate-300 leading-relaxed font-sans bg-[#020617] p-3 rounded-lg border border-slate-800">
                {activeIncident.calculationExplanation}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[11px]">
                <div className="p-2 rounded bg-[#0c1527] border border-[#1e293b]">
                  <span className="text-slate-500">Spot Purchase Price:</span>
                  <div className="font-bold text-slate-200">₹{activeIncident.replacementCostPerKWh}/kWh</div>
                </div>
                <div className="p-2 rounded bg-[#0c1527] border border-[#1e293b]">
                  <span className="text-slate-500">Base Generation Cost:</span>
                  <div className="font-bold text-slate-200">₹{activeIncident.normalCostPerKWh}/kWh</div>
                </div>
                <div className="p-2 rounded bg-[#0c1527] border border-[#1e293b]">
                  <span className="text-slate-500">Value of Lost Load (VoLL):</span>
                  <div className="font-bold text-slate-200">₹{activeIncident.economicImpactPerMWh.toLocaleString()}/MWh</div>
                </div>
                <div className="p-2 rounded bg-[#0c1527] border border-[#1e293b]">
                  <span className="text-slate-500">Assumed Offline Duration:</span>
                  <div className="font-bold text-slate-200">{activeIncident.assumedOutageDurationHrs} Hours</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-500">
            No incident selected.
          </div>
        )}
      </div>
    </div>
  );
};
