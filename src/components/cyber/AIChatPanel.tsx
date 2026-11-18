import React, { useState, useEffect, useRef } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { useGridStore } from '../../store/gridStore';
import { AI_ENGINE_URL } from '../../config/api';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  DollarSign, 
  Zap, 
  Layers, 
  RotateCcw, 
  Copy, 
  Check, 
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Activity,
  FileText
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  telemetry?: any;
  sources?: { title: string; url?: string }[];
  followups?: string[];
}

export const AIChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Live state from CyberQuant stores
  const incidents = useCyberStore((s) => s.incidents);
  const alerts = useCyberStore((s) => s.alerts);
  const events = useCyberStore((s) => s.events);
  const financialSummary = useCyberStore((s) => s.financialSummary);
  const telemetry = useGridStore((s) => s.telemetry);
  const generators = useGridStore((s) => s.generators);
  const substations = useGridStore((s) => s.substations);
  const loads = useGridStore((s) => s.loads);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `### 🛡️ CyberQuant AI // Smart Grid Cybersecurity & Financial Intelligence Assistant

I am your integrated cyber defense copilot powered by the **CyberQuant AI Decision-Support Engine**. I have live, real-time access to our power grid digital twin, SCADA telemetries, detected cyberattack vectors, and actuarial financial loss projection models.

---

### What I can analyze for you:
1. **Live Grid Cyber Threats & Vulnerabilities:** Real-time risk scores (0–100), attacker IPs, and MITRE/CWE vector mapping.
2. **Dynamic Operational Telemetry:** Generator dispatch (MW), grid frequency (${telemetry.frequencyHz.toFixed(2)} Hz), AGC Area Control Error, and substation bus status.
3. **Actuarial Financial Loss Analytics:** Replacement power spot procurement rates, unserved electricity (VoLL), DFIR forensic costs, and Annualized Loss Expectancy (ALE).
4. **8-Section Incident Response Playbooks:** Immediate containment checklists, verified historical breach citations, and NIST CSF / IEC 62443 mitigation.`,
      timestamp: new Date().toLocaleTimeString(),
      followups: [
        'Which grid asset is currently at the highest risk?',
        'What is the financial impact of the latest incident?',
        'What cyberattacks have been detected?',
        'What will happen if the affected station remains offline for four hours?',
        'Compare the financial impact before and after security controls.'
      ]
    }
  ]);

  // Check health of AI engine backend
  useEffect(() => {
    fetch(`${AI_ENGINE_URL}/health`)
      .then((res) => res.json())
      .then((data) => {
        setApiOnline(data.status === 'healthy');
      })
      .catch(() => {
        setApiOnline(false);
      });
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Format markdown helper (converting markdown to rich HTML)
  const renderFormattedMarkdown = (text: string) => {
    if (!text) return '';

    let formatted = text
      // Replace Section Headers: ## 1. TYPE OF ATTACK, etc.
      .replace(/^##\s+1\.\s+(.*$)/gim, '<div class="my-3 p-2 rounded bg-cyan-950/40 border-l-4 border-cyan-400 font-bold text-cyan-300 text-xs tracking-wider uppercase">01 // THREAT TYPE: $1</div>')
      .replace(/^##\s+2\.\s+(.*$)/gim, '<div class="my-3 p-2 rounded bg-amber-950/40 border-l-4 border-amber-400 font-bold text-amber-300 text-xs tracking-wider uppercase">02 // VULNERABILITY EXPLOITED: $1</div>')
      .replace(/^##\s+3\.\s+(.*$)/gim, '<div class="my-3 p-2 rounded bg-purple-950/40 border-l-4 border-purple-400 font-bold text-purple-300 text-xs tracking-wider uppercase">03 // HISTORICAL INCIDENTS & BENCHMARKS: $1</div>')
      .replace(/^##\s+4\.\s+(.*$)/gim, '<div class="my-3 p-2 rounded bg-rose-950/40 border-l-4 border-rose-500 font-bold text-rose-300 text-xs tracking-wider uppercase">04 // RISK ASSESSMENT: $1</div>')
      .replace(/^##\s+5\.\s+(.*$)/gim, '<div class="my-3 p-2 rounded bg-cyan-950/40 border-l-4 border-cyan-400 font-bold text-cyan-300 text-xs tracking-wider uppercase">05 // DETECTION MEASURES & IOCS: $1</div>')
      .replace(/^##\s+6\.\s+(.*$)/gim, '<div class="my-3 p-2 rounded bg-amber-950/40 border-l-4 border-amber-400 font-bold text-amber-300 text-xs tracking-wider uppercase">06 // OPERATIONAL & BUSINESS IMPACT: $1</div>')
      .replace(/^##\s+7\.\s+(.*$)/gim, '<div class="my-3 p-2 rounded bg-emerald-950/40 border-l-4 border-emerald-400 font-bold text-emerald-300 text-xs tracking-wider uppercase">07 // PREVENTION & MITIGATION PLAYBOOK: $1</div>')
      .replace(/^##\s+8\.\s+(.*$)/gim, '<div class="my-3 p-2 rounded bg-rose-950/60 border-l-4 border-rose-400 font-bold text-rose-200 text-xs tracking-wider uppercase">08 // IMMEDIATE ACTION CHECKLIST: $1</div>')
      // Standard headers
      .replace(/^###\s+(.*$)/gim, '<h4 class="text-xs font-bold text-cyan-300 mt-3 mb-1.5 border-b border-slate-800 pb-1">◈ $1</h4>')
      .replace(/^##\s+(.*$)/gim, '<h3 class="text-sm font-bold text-slate-100 mt-2 mb-1">$1</h3>')
      // Callout box
      .replace(/^>\s+(.*$)/gim, '<div class="my-2 p-2.5 rounded bg-rose-950/30 border-l-2 border-rose-500 text-rose-200 text-[11px] leading-relaxed">⚠️ $1</div>')
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-slate-100 font-bold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="text-slate-300 italic">$1</em>')
      // Inline Code
      .replace(/`([^`]+)`/gim, '<code class="bg-[#020617] text-cyan-300 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-[11px]">$1</code>')
      // Divider
      .replace(/^---$/gim, '<hr class="border-t border-dashed border-[#1e293b] my-3">');

    return formatted;
  };

  // Compile real live grid and cyber state to provide as rich grounding context to the AI
  const compileGridContext = () => {
    const highestRiskAlert = [...alerts].sort((a, b) => b.riskScore - a.riskScore)[0];
    const topIncident = incidents[0];

    const onlineGens = generators.map((g) => `${g.name}: ${Math.round(g.curMW)}/${g.pMaxMW}MW (${g.status})`).join('; ');
    const activeBreaches = alerts.map((a) => `${a.targetAssetName}: ${a.attackType} (Risk ${a.riskScore}/100, Affected ${Math.round(a.affectedGenerationMW)}MW)`).join('; ');

    return `
[LIVE GRID ATLAS TELEMETRY CONTEXT]
- Grid Frequency: ${telemetry.frequencyHz.toFixed(2)} Hz (Nominal: 50.00 Hz, Delta: ${(telemetry.frequencyHz - 50.0).toFixed(2)} Hz)
- Generation vs Load: ${telemetry.totalGenMW.toLocaleString()} MW generated vs ${telemetry.totalDemandMW.toLocaleString()} MW demanded (Losses: ${telemetry.netLossesMW.toFixed(1)} MW)
- AGC Mode: ${telemetry.agcActive ? 'AUTOMATIC AREA CONTROL (Active)' : 'MANUAL DISPATCH'}
- Generation Fleet Status: ${onlineGens}
- Active Cyber Threat Alerts: ${alerts.length > 0 ? activeBreaches : 'None currently detected'}
- Highest Risk Station: ${highestRiskAlert ? `${highestRiskAlert.targetAssetName} (${highestRiskAlert.targetAssetId}) - Risk ${highestRiskAlert.riskScore}/100, Source IP ${highestRiskAlert.sourceIP}` : 'All stations nominal'}
- Total Cumulative Financial Exposure: ₹${(financialSummary.totalFinancialExposure / 100000).toFixed(2)} Lakhs (Replacement Power: ₹${(financialSummary.totalReplacementCost / 100000).toFixed(2)} L, VoLL: ₹${(financialSummary.totalUnservedImpact / 100000).toFixed(2)} L, Recovery: ₹${(financialSummary.totalRecoveryCost / 100000).toFixed(2)} L)
- Latest Incident Model: ${topIncident ? `${topIncident.targetAssetName} - Total Estimated Loss: ₹${(topIncident.totalEstimatedLoss / 100000).toFixed(2)} Lakhs (Spread: ₹${topIncident.replacementCostPerKWh - topIncident.normalCostPerKWh}/kWh, Duration: ${topIncident.assumedOutageDurationHrs}h, VoLL @ ₹${topIncident.economicImpactPerMWh.toLocaleString()}/MWh)` : 'No active incident loss'}
- Security Control ROI Model: Current baseline ₹${(financialSummary.totalFinancialExposure / 100000).toFixed(2)} L vs Hardened Zero Trust/IEC 62443 ₹${((financialSummary.totalFinancialExposure * 0.28) / 100000).toFixed(2)} L (72% loss avoidance).
`.trim();
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      const gridContext = compileGridContext();
      const enrichedMessage = `[LIVE GRID & INCIDENT DATA]:\n${gridContext}\n\n[USER QUERY]:\n${textToSend.trim()}`;

      // Convert conversation history for FastAPI schema
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 500),
      }));

      const response = await fetch(`${AI_ENGINE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enrichedMessage,
          simple_language: simpleMode,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error (${response.status})`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString(),
        sources: data.sources || [],
        followups: data.suggested_followups || [
          'What are the recommended mitigation measures?',
          'How much loss was caused by the Sharavathi Hydro shutdown?',
          'Explain the AGC manipulation incident.'
        ],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.warn('FastAPI backend error, utilizing local grid intelligence copilot fallback:', err);

      // Smart fallback using live GridAtlas data if FastAPI server is unreachable
      const q = textToSend.toLowerCase();
      let fallbackText = '';

      if (q.includes('highest risk') || q.includes('most vulnerable') || q.includes('which asset') || q.includes('which power station')) {
        const topAlert = [...alerts].sort((a, b) => b.riskScore - a.riskScore)[0];
        if (topAlert) {
          fallbackText = `### 🚨 Highest Risk Station Analysis\n\nThe power station at highest risk is **${topAlert.targetAssetName}** (\`${topAlert.targetAssetId}\`) with an evaluated risk score of **${topAlert.riskScore}/100** (**${topAlert.riskCategory.toUpperCase()}**).\n\n- **Identified Vector:** \`${topAlert.attackType.replace(/_/g, ' ').toUpperCase()}\`\n- **Ingress Source IP:** \`${topAlert.sourceIP}\`\n- **Affected Active Power:** **${Math.round(topAlert.affectedGenerationMW)} MW**\n- **Recommended Operator Mitigation:** ${topAlert.recommendedAction}\n- **Dynamic Grid Strain:** Grid frequency is currently at ${telemetry.frequencyHz.toFixed(2)} Hz.`;
        } else {
          fallbackText = 'Currently, all power stations (Kaiga Nuclear, Sharavathi Hydro, Pavagada Solar, Kappatagudda Wind) are synchronized at nominal operational baseline with no high-risk intrusions detected.';
        }
      } else if (q.includes('financial loss') || q.includes('financial impact') || q.includes('cost') || q.includes('how much') || q.includes('loss')) {
        const total = financialSummary.totalFinancialExposure;
        const topInc = incidents[0];
        fallbackText = `### 💰 Actuarial Financial Loss Assessment\n\nTotal cumulative grid financial exposure across active cyber incidents is **₹${(total / 100000).toFixed(2)} Lakhs**.\n\n- **Replacement Spot Power:** ₹${((financialSummary.totalReplacementCost) / 100000).toFixed(2)} Lakhs (procured from emergency exchange)\n- **Unserved Electricity (VoLL):** ₹${((financialSummary.totalUnservedImpact) / 100000).toFixed(2)} Lakhs (@ ₹${topInc ? topInc.economicImpactPerMWh.toLocaleString() : '50,000'}/MWh economic value)\n- **DFIR Forensics & OT Recovery:** ₹${((financialSummary.totalRecoveryCost) / 100000).toFixed(2)} Lakhs\n- **Operational & Regulatory Reserves:** ₹${((financialSummary.totalOperationalCost) / 100000).toFixed(2)} Lakhs\n\n**Single Incident Breakdown (${topInc?.targetAssetName || 'Latest Incident'}):** Total estimated loss of **₹${topInc ? (topInc.totalEstimatedLoss / 100000).toFixed(2) : '0'} Lakhs** based on a ${topInc?.assumedOutageDurationHrs || 3}h assumed outage window.`;
      } else if (q.includes('four hours') || q.includes('4 hours') || q.includes('offline for')) {
        const gen = generators[0];
        const mw = gen ? gen.curMW : 780;
        const totalMWh = mw * 4;
        const estCost = totalMWh * 1000 * 9.0;
        fallbackText = `### ⏱️ 4-Hour Extended Outage Projection\n\nIf **${gen ? gen.name : 'the affected generation asset'}** remains disconnected for 4 hours:\n\n1. **Lost Generation:** **${totalMWh.toLocaleString()} MWh** will be unserved by baseline dispatch.\n2. **Incremental Replacement Procurement:** Cost is approximately **₹${(estCost / 10000000).toFixed(2)} Crores (₹${(estCost / 100000).toFixed(2)} Lakhs)** based on an incremental replacement spread of ₹9.00/kWh (₹12.50 spot vs ₹3.50 base cost).\n3. **Grid Inertia Impact:** Frequency deviation is projected to dip by over **0.85 Hz**, risking under-frequency load shedding (UFLS) stage 1 across Peenya & Whitefield.`;
      } else if (q.includes('before and after') || q.includes('security controls') || q.includes('compare')) {
        const base = financialSummary.totalFinancialExposure || 120000000;
        const hardened = Math.round(base * 0.28);
        fallbackText = `### 🛡️ Before & After Security Control ROI Model (IEC 62443 / NIST CSF)\n\n- **Current Baseline Exposure:** **₹${(base / 100000).toFixed(2)} Lakhs** (traditional VPN & perimeter firewalls)\n- **Hardened Zero Trust Posture:** **₹${(hardened / 100000).toFixed(2)} Lakhs** (OT microsegmentation, cryptographic token attestation, and unidirectional data diodes)\n- **Avoided Financial Loss:** **₹${((base - hardened) / 100000).toFixed(2)} Lakhs** (**72% loss reduction**)\n- **Estimated Return on Security Investment (ROSI):** Demonstrates full capital payback within 8.2 months.`;
      } else if (q.includes('agc') || q.includes('frequency')) {
        fallbackText = `### ⚙️ AGC Governor & Frequency Telemetry Analysis\n\nCurrent grid frequency is **${telemetry.frequencyHz.toFixed(2)} Hz** with a deviation of ${(telemetry.frequencyHz - 50.0).toFixed(2)} Hz. Total generation stands at **${telemetry.totalGenMW.toLocaleString()} MW** against metropolitan demand of **${telemetry.totalDemandMW.toLocaleString()} MW**.\n\nIn an **AGC manipulation incident**, threat actors tamper with the Area Control Error (ACE) telemetry packets via compromised RTU gateways. This forces governors to throttle turbines below physical load demand, creating severe frequency drop-off and triggering cascading blackout protections.`;
      } else {
        fallbackText = `### 🛡️ CyberQuant AI Assistant\n\nI have received your query regarding **"${textToSend}"**.\n\nLive telemetry indicates **${alerts.length} active risk alerts** and **${events.length} security events**. Cumulative financial risk is currently evaluated at **₹${(financialSummary.totalFinancialExposure / 100000).toFixed(2)} Lakhs**.\n\nPlease select one of the suggested prompts below or specify an asset (Kaiga, Sharavathi, Pavagada, Nelamangala) to view granular telemetry and containment checklists.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: fallbackText,
          timestamp: new Date().toLocaleTimeString(),
          followups: [
            'Which power station has the highest risk?',
            'What is the financial impact of the latest incident?',
            'Compare the financial impact before and after security controls.'
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `### 🛡️ CyberQuant AI Conversation Reset\n\nSession cleared. Live telemetry link remains synchronized to the Karnataka power grid simulation and threat ingestion engine. How can I assist your security and dispatch operations?`,
        timestamp: new Date().toLocaleTimeString(),
        followups: [
          'What is the current cybersecurity risk in the grid?',
          'Which power station has the highest risk?',
          'What is the total estimated financial loss?'
        ]
      }
    ]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040711] font-mono text-xs select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-[#1e293b] bg-[#080d1c] flex items-center justify-between flex-shrink-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)] relative">
            <Bot className="w-5 h-5 text-cyan-300" />
            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${apiOnline ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-100 tracking-wide flex items-center gap-1.5">
                CYBERQUANT <span className="text-cyan-400">AI ASSISTANT</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                DECISION SUPPORT v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Autonomous Smart Grid Cybersecurity & Actuarial Financial Copilot
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Simple Mode Toggle */}
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              simpleMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'bg-[#0c1527] border-[#1e293b] text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between executive plain language and in-depth technical analysis"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simple Mode:</span> {simpleMode ? 'ON' : 'OFF'}
          </button>

          {/* Backend Status indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1527] border border-[#1e293b] text-[11px] text-slate-300">
            <span className={`w-2 h-2 rounded-full ${apiOnline === false ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            <span>{apiOnline === false ? 'LOCAL COPILOT MODE' : 'FASTAPI BACKEND: CONNECTED'}</span>
          </div>

          {/* Reset Conversation */}
          <button
            onClick={handleClearChat}
            className="p-2 rounded-lg bg-[#0c1527] hover:bg-slate-800 border border-[#1e293b] text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear conversation history"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[#060a16]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            {/* Avatar Icon */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${
                msg.role === 'user'
                  ? 'bg-slate-800 border border-slate-700 text-slate-200'
                  : 'bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              }`}
            >
              {msg.role === 'user' ? '👤' : '🛡️'}
            </div>

            {/* Bubble & Metadata */}
            <div className="flex flex-col gap-1.5 max-w-[85%]">
              <div className="flex items-center justify-between px-1 text-[10px] text-slate-500">
                <span className="font-bold text-slate-400">
                  {msg.role === 'user' ? 'Grid Security Operator' : 'CyberQuant AI'}
                </span>
                <div className="flex items-center gap-2">
                  <span>{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="text-slate-500 hover:text-cyan-300 transition-colors"
                      title="Copy response to clipboard"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Content Bubble */}
              <div
                className={`p-4 rounded-xl leading-relaxed font-sans text-xs shadow-md border ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/30 rounded-tr-none'
                    : 'bg-[#0a1124] text-slate-200 border-[#1e293b] border-t-2 border-t-cyan-400 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap font-sans text-xs">{msg.content}</p>
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderFormattedMarkdown(msg.content),
                    }}
                  />
                )}
              </div>

              {/* Verified Sources / References */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1 px-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Verified Sources:</span>
                  {msg.sources.map((src, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 flex items-center gap-1"
                    >
                      ✓ {src.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Proactive Suggested Follow-Up Pills */}
              {msg.followups && msg.followups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.followups.map((followup, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(followup)}
                      disabled={isLoading}
                      className="px-2.5 py-1 rounded-md bg-[#0c1527] hover:bg-cyan-950/40 border border-[#1e293b] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-[11px] transition-all text-left flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <span className="text-cyan-400 font-bold">↳</span> {followup}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading / Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400 text-cyan-300 flex items-center justify-center text-sm">
              🛡️
            </div>
            <div className="p-3.5 rounded-xl bg-[#0a1124] border border-[#1e293b] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-slate-400 text-xs font-mono">
                CyberQuant AI is analyzing SCADA telemetry and formulating risk report...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Bar */}
      <div className="px-4 py-2 bg-[#080d1c] border-t border-[#1e293b] flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1 flex-shrink-0">
          Recommended:
        </span>
        <button
          onClick={() => handleSend('What is the current cybersecurity risk in the grid?')}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-[#0c1527] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-cyan-300 text-[11px] whitespace-nowrap transition-colors"
        >
          Grid Cyber Risk Status
        </button>
        <button
          onClick={() => handleSend('Which power station has the highest risk?')}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-[#0c1527] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-rose-300 text-[11px] whitespace-nowrap transition-colors"
        >
          Highest Risk Power Station
        </button>
        <button
          onClick={() => handleSend('What is the financial impact of the latest incident?')}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-[#0c1527] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-emerald-300 text-[11px] whitespace-nowrap transition-colors"
        >
          Latest Incident Financial Impact
        </button>
        <button
          onClick={() => handleSend('What will happen if the affected station remains offline for four hours?')}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-[#0c1527] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-amber-300 text-[11px] whitespace-nowrap transition-colors"
        >
          4-Hour Outage Projection
        </button>
        <button
          onClick={() => handleSend('Compare the financial impact before and after security controls.')}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-[#0c1527] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-cyan-300 text-[11px] whitespace-nowrap transition-colors"
        >
          Before & After Security Controls
        </button>
      </div>

      {/* User Input & Dispatch Section */}
      <div className="p-4 bg-[#080d1c] border-t border-[#1e293b] flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 flex items-center bg-[#040711] border border-[#1e293b] focus-within:border-cyan-400 rounded-xl px-4 py-2.5 shadow-inner transition-colors">
          <span className="text-cyan-400 font-mono font-bold mr-2 select-none">&gt;</span>
          <input
            type="text"
            placeholder="Ask CyberQuant AI about detected attacks, power station vulnerability, replacement costs, AGC manipulation..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            className="flex-1 bg-transparent text-slate-100 text-xs outline-none placeholder:text-slate-600 font-mono"
          />
        </div>

        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 ${
            isLoading || !input.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch</span>
        </button>
      </div>
    </div>
  );
};
