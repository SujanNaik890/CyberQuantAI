import React, { useState } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { useGridStore } from '../../store/gridStore';
import { Bot, Send, Sparkles, ShieldAlert, DollarSign, Activity, Zap } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AIChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const incidents = useCyberStore((s) => s.incidents);
  const alerts = useCyberStore((s) => s.alerts);
  const events = useCyberStore((s) => s.events);
  const financialSummary = useCyberStore((s) => s.financialSummary);
  const telemetry = useGridStore((s) => s.telemetry);
  const generators = useGridStore((s) => s.generators);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Greetings. I am CyberQuant AI — your grid cyber risk and financial intelligence advisor. I have direct access to live telemetry, active cyber incident alerts, and loss projection models. Ask me anything regarding current security exposure or dispatch priorities.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const query = input.toLowerCase();
    setInput('');

    // Generate responsive, grounded intelligence answers based on real stored state
    setTimeout(() => {
      let reply = '';

      if (query.includes('highest risk') || query.includes('most vulnerable') || query.includes('which asset')) {
        const topAlert = [...alerts].sort((a, b) => b.riskScore - a.riskScore)[0];
        if (topAlert) {
          reply = `The highest risk asset is currently **${topAlert.targetAssetName}** (${topAlert.targetAssetId}) with a risk score of **${topAlert.riskScore}/100** (${topAlert.riskCategory.toUpperCase()}). The detected threat is **${topAlert.attackType.replace(/_/g, ' ')}** originating from IP ${topAlert.sourceIP}. Operational action: ${topAlert.recommendedAction}`;
        } else {
          reply = 'Currently, all grid assets are operating at nominal baseline without active high-risk alerts.';
        }
      } else if (query.includes('financial loss') || query.includes('how much') || query.includes('money') || query.includes('exposure') || query.includes('cost')) {
        const total = financialSummary.totalFinancialExposure;
        const current = financialSummary.currentIncidentLoss;
        const topInc = incidents[0];
        reply = `Total cumulative grid financial exposure across active incidents is **₹${(total / 100000).toFixed(2)} Lakhs**. The latest incident at **${topInc?.targetAssetName || 'Kaiga'}** accounts for **₹${(current / 100000).toFixed(2)} Lakhs** in estimated losses, including ₹${((topInc?.replacementElectricityCost || 0) / 100000).toFixed(2)} L for replacement spot power and ₹${((topInc?.unservedElectricityImpact || 0) / 100000).toFixed(2)} L in unserved economic load.`;
      } else if (query.includes('four hours') || query.includes('4 hours') || query.includes('offline for')) {
        const gen = generators[0];
        const mw = gen ? gen.curMW : 780;
        const totalMWh = mw * 4;
        const estCost = totalMWh * 1000 * (12.5 - 3.5); // net replacement cost
        reply = `If ${gen ? gen.name : 'the affected station'} remains offline for 4 hours, approximately **${totalMWh.toLocaleString()} MWh** of generation will be lost. At spot replacement spread of ₹9.00/kWh, replacement electricity procurement alone will cost approximately **₹${(estCost / 10000000).toFixed(2)} Crores (₹${(estCost / 100000).toFixed(2)} Lakhs)**, not counting VoLL penalties or system restoration expenses.`;
      } else if (query.includes('priority') || query.includes('recommend') || query.includes('response')) {
        reply = `Immediate response priorities:\n1. **Isolate Compromised Ingress**: Block attacker IP pools on perimeter firewall.\n2. **Manual Governor Transfer**: Revert targeted generation plants from AGC remote dispatch to local droop control.\n3. **Reserve Spinning Dispatch**: Ramp Sharavathi Hydro or Pavagada Solar to offset potential sudden generator loss.\n4. **Verify GOOSE / Modbus Packets**: Initiate physical verification of substation breaker interlocks.`;
      } else if (query.includes('frequency') || query.includes('grid status')) {
        reply = `Current grid frequency is **${telemetry.frequencyHz.toFixed(2)} Hz** (nominal: 50.00 Hz, deviation: ${(telemetry.frequencyHz - 50.0).toFixed(2)} Hz). Total generation is **${telemetry.totalGenMW.toLocaleString()} MW** against demand of **${telemetry.totalDemandMW.toLocaleString()} MW**. AGC Governor dispatch is **${telemetry.agcActive ? 'ACTIVE' : 'MANUAL'}**.`;
      } else {
        reply = `Acknowledged. Based on live CyberQuant telemetry, there are currently **${alerts.length} active risk alerts** and **${events.length} security telemetry events** registered. Total modeled loss exposure stands at **₹${(financialSummary.totalFinancialExposure / 100000).toFixed(2)} Lakhs**. What specific substation, plant, or financial metric would you like me to inspect?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }, 450);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050b14] font-mono text-xs select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#1e293b] bg-[#070e1b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100 flex items-center gap-1.5">
              CYBERQUANT INTEL ASSISTANT <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-[10px] text-slate-400">Integrated Grid Cyber Risk & Actuarial Financial Copilot</div>
          </div>
        </div>

        {/* Quick query pills */}
        <div className="hidden lg:flex items-center gap-2 text-[10px]">
          <button
            onClick={() => setInput('Which grid asset is currently at the highest risk?')}
            className="px-2 py-1 rounded bg-[#0c1527] border border-[#1e293b] text-slate-300 hover:text-cyan-300 transition-colors"
          >
            Highest Risk Asset?
          </button>
          <button
            onClick={() => setInput('How much financial loss could this incident cause?')}
            className="px-2 py-1 rounded bg-[#0c1527] border border-[#1e293b] text-slate-300 hover:text-emerald-300 transition-colors"
          >
            Total Financial Exposure?
          </button>
          <button
            onClick={() => setInput('What will happen if the affected station remains offline for four hours?')}
            className="px-2 py-1 rounded bg-[#0c1527] border border-[#1e293b] text-slate-300 hover:text-amber-300 transition-colors"
          >
            4-Hour Outage Impact?
          </button>
        </div>
      </div>

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1">
              <span>{m.sender === 'user' ? 'Operator' : 'CyberQuant AI'}</span>
              <span>•</span>
              <span>{m.timestamp}</span>
            </div>
            <div
              className={`p-3.5 rounded-xl max-w-2xl leading-relaxed whitespace-pre-wrap font-sans text-xs ${
                m.sender === 'user'
                  ? 'bg-cyan-950/60 border border-cyan-500/50 text-slate-100 rounded-br-none'
                  : 'bg-[#0c1527] border border-[#1e293b] text-slate-200 rounded-bl-none shadow-lg'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-[#1e293b] bg-[#070e1b] flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask CyberQuant AI about cyber risk scores, replacement costs, outage projections..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-[#050b14] border border-[#1e293b] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </div>
    </div>
  );
};
