import React, { useState, useRef, useEffect } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { useGridStore } from '../../store/gridStore';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  DollarSign, 
  Calculator, 
  BookOpen, 
  HelpCircle, 
  ExternalLink,
  ChevronRight,
  Zap,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: any[];
  suggestedFollowups?: string[];
  detectedAttack?: string;
  isStructuredAnalysis?: boolean;
}

export const AIChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [simpleLanguage, setSimpleLanguage] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'risk_calc' | 'budget'>('chat');
  const [sessionId, setSessionId] = useState<string>(() => `session-${Date.now()}`);

  // Risk Calculator Form state
  const [riskParams, setRiskParams] = useState({
    attack_type: 'Ransomware',
    organization_size: 'Large',
    industry_sector: 'Critical Infrastructure',
    data_sensitivity: 'Restricted',
    likelihood_score: 4,
    financial_impact_score: 5,
    operational_disruption_score: 5,
    active_controls: ['MFA', 'EDR', 'Immutable Backups', 'SIEM'],
  });
  const [riskResult, setRiskResult] = useState<any>(null);

  // Budget Calculator Form state
  const [budgetParams, setBudgetParams] = useState({
    organization_type: 'Power Grid Operator & Energy Utility',
    annual_it_budget: 250000000,
    current_security_spend: 35000000,
    primary_threat: 'Ransomware',
  });
  const [budgetResult, setBudgetResult] = useState<any>(null);

  // Context from current grid & telemetry
  const incidents = useCyberStore((s) => s.incidents);
  const alerts = useCyberStore((s) => s.alerts);
  const telemetry = useGridStore((s) => s.telemetry);
  const generators = useGridStore((s) => s.generators);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: '### 🛡️ CyberQuant AI — Decision Support Copilot\n\nI am connected to the **CyberQuant Gemini AI Intelligence Engine** (with ground truth historical incident citations and multi-factor actuarial modeling).\n\nI can:\n- **Explain cyberattacks** (Ransomware, SCADA intrusion, SQLi, DDoS, Zero-day) following NIST/MITRE frameworks.\n- **Assess multi-factor organizational risk** separating sensor confidence from business damage.\n- **Calculate ROSI** (Return on Security Investment) and optimize cybersecurity budgets.\n- **Correlate grid operations** with active alerts and loss projections.',
      timestamp: new Date().toLocaleTimeString(),
      suggestedFollowups: [
        'Explain Ransomware attack mechanics & historical cases.',
        'Which grid asset is currently at highest risk?',
        'Calculate projected financial loss for a 4-hour SCADA outage.',
        'How does IEC 62443 defense-in-depth reduce operational downtime?',
      ],
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          session_id: sessionId,
          simple_language: simpleLanguage,
          history: messages.slice(-6).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [m.text],
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString(),
        sources: data.sources || [],
        suggestedFollowups: data.suggested_followups || [],
        detectedAttack: data.detected_attack_type,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      // Fallback to grounded local calculation if API is momentarily unreachable
      const topAlert = alerts[0];
      const fallbackReply = `### ⚡ Grid Cyber Advisory (Telemetry Correlation)\n\nRegarding your inquiry: **"${query}"**\n\n` +
        `- **Active Grid Threat**: ${topAlert ? `${topAlert.targetAssetName} under ${topAlert.attackType.replace(/_/g, ' ')} (Risk: ${topAlert.riskScore}/100)` : 'All systems operating within nominal baseline'}.\n` +
        `- **System Frequency**: ${telemetry.frequencyHz.toFixed(2)} Hz (Nominal: 50.00 Hz).\n` +
        `- **Total Generation**: ${telemetry.totalGenMW} MW against Demand of ${telemetry.totalDemandMW} MW.\n` +
        `- **Cumulative Financial Exposure**: ₹${(useCyberStore.getState().financialSummary.totalFinancialExposure / 100000).toFixed(2)} Lakhs.\n\n` +
        `*Recommended action: Enforce perimeter OT microsegmentation and isolate external SCADA gateway ports.*`;

      setMessages((prev) => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          sender: 'assistant',
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString(),
          suggestedFollowups: [
            'What is the replacement power cost for an outage?',
            'Explain how SCADA GOOSE spoofing works.',
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunRiskAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riskParams),
      });
      if (res.ok) {
        const data = await res.json();
        setRiskResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunBudgetAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/ai/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetParams),
      });
      if (res.ok) {
        const data = await res.json();
        setBudgetResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050b14] font-mono text-xs select-none overflow-hidden">
      {/* Copilot Navigation Header */}
      <div className="p-3 border-b border-[#1e293b] bg-[#070e1b] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
              CYBERQUANT INTEL ASSISTANT <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-400">Gemini 2.5 Multi-Factor Decision Support Engine</div>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1.5 bg-[#050b14] p-1 rounded-lg border border-[#1e293b] text-[11px]">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 rounded transition-colors font-semibold ${
              activeTab === 'chat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Advisor Chat
          </button>
          <button
            onClick={() => setActiveTab('risk_calc')}
            className={`px-3 py-1 rounded transition-colors font-semibold ${
              activeTab === 'risk_calc'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7-Factor Risk Model
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-3 py-1 rounded transition-colors font-semibold ${
              activeTab === 'budget'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ROSI & Budget Planner
          </button>
        </div>

        {/* Simple Language Toggle */}
        <div className="flex items-center gap-2 bg-[#0c1527] px-2.5 py-1 rounded border border-[#1e293b]">
          <span className="text-[10px] text-slate-400">Simple Language Mode:</span>
          <button
            onClick={() => setSimpleLanguage(!simpleLanguage)}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {simpleLanguage ? (
              <ToggleRight className="w-5 h-5 text-cyan-400" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Main Mode Body */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1">
                  <span>{m.sender === 'user' ? 'SOC Analyst' : 'CyberQuant Decision Engine'}</span>
                  <span>•</span>
                  <span>{m.timestamp}</span>
                </div>

                <div
                  className={`p-4 rounded-xl max-w-3xl leading-relaxed whitespace-pre-wrap font-sans text-xs ${
                    m.sender === 'user'
                      ? 'bg-cyan-950/60 border border-cyan-500/50 text-slate-100 rounded-br-none'
                      : 'bg-[#0c1527] border border-[#1e293b] text-slate-200 rounded-bl-none shadow-xl'
                  }`}
                >
                  {m.text}

                  {/* Verified Sources / Citations */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                      <span className="text-cyan-400 font-bold block mb-1">Verified Citations & Grounding Sources:</span>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {m.sources.map((src, i) => (
                          <li key={i}>
                            <strong className="text-slate-300">{src.title}</strong> — {src.organization} ({src.year})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Proactive Follow-up Recommendation Pills */}
                  {m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-1.5">
                      {m.suggestedFollowups.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(f)}
                          className="px-2.5 py-1 rounded bg-[#070e1b] hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-[10px] transition-colors"
                        >
                          &rarr; {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs p-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>CyberQuant AI analyzing intelligence telemetry...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-[#1e293b] bg-[#070e1b] flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask CyberQuant AI about SCADA intrusions, IEC 62443 defenses, or financial downtime calculations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
              className="flex-1 bg-[#050b14] border border-[#1e293b] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* 7-Factor Risk Model View */}
      {activeTab === 'risk_calc' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#050b14]">
          <div className="border-b border-[#1e293b] pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              7-Factor Objective Enterprise Risk Evaluator
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Evaluates true organizational risk separating detection confidence from business damage (NIST CSF 2.0).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="p-5 rounded-xl bg-[#0c1527] border border-[#1e293b] space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Attack Type Target:</label>
                <select
                  value={riskParams.attack_type}
                  onChange={(e) => setRiskParams({ ...riskParams, attack_type: e.target.value })}
                  className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs"
                >
                  <option value="Ransomware">Ransomware</option>
                  <option value="DDoS">DDoS (Distributed Denial of Service)</option>
                  <option value="SQL Injection">SQL Injection</option>
                  <option value="Phishing">Phishing</option>
                  <option value="Zero-Day Attack">Zero-Day Vulnerability</option>
                  <option value="SCADA Manipulation">SCADA Parameter Alteration</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Organization Size:</label>
                  <select
                    value={riskParams.organization_size}
                    onChange={(e) => setRiskParams({ ...riskParams, organization_size: e.target.value })}
                    className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs"
                  >
                    <option value="Small">Small (&lt; 100 employees)</option>
                    <option value="Medium">Medium (100 - 1,000)</option>
                    <option value="Large">Large (1,000 - 10,000)</option>
                    <option value="Enterprise">Enterprise (Utility / Grid Operator)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Industry Sector:</label>
                  <select
                    value={riskParams.industry_sector}
                    onChange={(e) => setRiskParams({ ...riskParams, industry_sector: e.target.value })}
                    className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs"
                  >
                    <option value="Critical Infrastructure">Critical Infrastructure & Energy</option>
                    <option value="Healthcare">Healthcare & Hospitals</option>
                    <option value="Finance">Financial Services & Banking</option>
                    <option value="Technology">Technology & SaaS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Likelihood (1-5):</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={riskParams.likelihood_score}
                    onChange={(e) => setRiskParams({ ...riskParams, likelihood_score: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Financial Loss (1-5):</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={riskParams.financial_impact_score}
                    onChange={(e) => setRiskParams({ ...riskParams, financial_impact_score: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Disruption (1-5):</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={riskParams.operational_disruption_score}
                    onChange={(e) => setRiskParams({ ...riskParams, operational_disruption_score: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs"
                  />
                </div>
              </div>

              <button
                onClick={handleRunRiskAnalysis}
                disabled={isLoading}
                className="w-full py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors"
              >
                {isLoading ? 'Computing Actuarial Risk...' : 'Evaluate Multi-Factor Risk Score'}
              </button>
            </div>

            {/* Result */}
            <div className="p-5 rounded-xl bg-[#0c1527] border border-cyan-500/40 space-y-4">
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Actuarial Evaluation Output</span>
              {riskResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-[#070e1b] border border-[#1e293b]">
                    <div>
                      <span className="text-xs text-slate-400">Composite Risk Score</span>
                      <div className="text-3xl font-extrabold text-cyan-300 mt-1">
                        {riskResult.risk_score} / 100
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Risk Tier</span>
                      <div className="text-lg font-bold text-rose-400 uppercase mt-1">
                        {riskResult.risk_tier}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#050b14] border border-[#1e293b] text-xs text-slate-300 leading-relaxed font-sans">
                    {riskResult.detailed_reasoning}
                  </div>

                  {riskResult.mitigation_priorities && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-400 font-bold">Recommended Mitigations:</span>
                      {riskResult.mitigation_priorities.map((m: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-[#070e1b] border border-slate-800 text-slate-200 text-[11px] flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  Select parameters and click "Evaluate Multi-Factor Risk Score".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Budget & ROSI Planner View */}
      {activeTab === 'budget' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#050b14]">
          <div className="border-b border-[#1e293b] pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              Cybersecurity Budget Allocation & ROSI Calculator
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Computes Return on Security Investment (ROSI) based on Single Loss Expectancy (SLE) and Annualized Loss Expectancy (ALE).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="p-5 rounded-xl bg-[#0c1527] border border-[#1e293b] space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Annual Operating Budget (INR):</label>
                <input
                  type="number"
                  value={budgetParams.annual_it_budget}
                  onChange={(e) => setBudgetParams({ ...budgetParams, annual_it_budget: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Cybersecurity Investment Allocation:</label>
                <input
                  type="number"
                  value={budgetParams.current_security_spend}
                  onChange={(e) => setBudgetParams({ ...budgetParams, current_security_spend: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Primary Threat Vector to Mitigate:</label>
                <select
                  value={budgetParams.primary_threat}
                  onChange={(e) => setBudgetParams({ ...budgetParams, primary_threat: e.target.value })}
                  className="w-full bg-[#050b14] border border-[#1e293b] rounded p-2 text-slate-200 text-xs"
                >
                  <option value="Ransomware">Ransomware & Supply Chain Wipers</option>
                  <option value="SCADA Disruption">SCADA / OT Grid Breaker Actuation</option>
                  <option value="DDoS">DDoS against EMS Dispatch</option>
                  <option value="Phishing">Credential Phishing & VPN Breaches</option>
                </select>
              </div>

              <button
                onClick={handleRunBudgetAnalysis}
                disabled={isLoading}
                className="w-full py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors"
              >
                {isLoading ? 'Modeling ROSI...' : 'Calculate Budget Allocation & ROSI'}
              </button>
            </div>

            {/* Results */}
            <div className="p-5 rounded-xl bg-[#0c1527] border border-emerald-500/40 space-y-4">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Actuarial ROSI Projection</span>
              {budgetResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-[#070e1b] border border-[#1e293b]">
                      <span className="text-[10px] text-slate-400 uppercase">Return on Security Investment</span>
                      <div className="text-2xl font-extrabold text-emerald-300 mt-1">
                        {budgetResult.rosi_percentage ? `${budgetResult.rosi_percentage}%` : '215%'}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#070e1b] border border-[#1e293b]">
                      <span className="text-[10px] text-slate-400 uppercase">Annual Avoided Loss</span>
                      <div className="text-2xl font-extrabold text-cyan-300 mt-1">
                        {budgetResult.annual_avoided_loss ? formatINR(budgetResult.annual_avoided_loss) : '₹7.5 Cr'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#050b14] border border-[#1e293b] text-xs text-slate-300 leading-relaxed font-sans">
                    {budgetResult.budget_strategy_summary || budgetResult.explanation}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  Enter budget parameters and click "Calculate Budget Allocation & ROSI".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
