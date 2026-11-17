import React, { useState } from 'react';
import { useCyberStore } from '../../store/cyberStore';
import { Bell, Volume2, VolumeX, ShieldAlert, CheckCircle, ExternalLink } from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useCyberStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isMuted = useCyberStore((s) => s.isMuted);
  const toggleMute = useCyberStore((s) => s.toggleMute);
  const markNotificationRead = useCyberStore((s) => s.markNotificationRead);
  const clearAllNotifications = useCyberStore((s) => s.clearAllNotifications);
  const setNavTab = useCyberStore((s) => s.setNavTab);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {/* Audio Mute Toggle */}
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute Alarm" : "Mute Alarm"}
          className="p-1.5 rounded bg-[#0c1527] border border-[#1e293b] text-slate-400 hover:text-cyan-300 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Bell Icon */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Cyber Security Threat Alerts"
          className="relative p-1.5 rounded bg-[#0c1527] border border-[#1e293b] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Flyout Notification Tray */}
      {isOpen && (
        <div className="absolute right-0 top-10 w-80 md:w-96 bg-[#070e1b]/95 border-2 border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(56,189,248,0.35)] backdrop-blur-xl z-[100] font-mono text-xs overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[#1e293b] bg-[#0c1527]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-100">Cyber Incident Alerts</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                {notifications.length}
              </span>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#1e293b]">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" />
                <p>No active threats detected.</p>
                <p className="text-[10px] text-slate-500 mt-1">Grid perimeter secure.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markNotificationRead(n.id);
                    setNavTab('alerts');
                    setIsOpen(false);
                  }}
                  className={`p-3 cursor-pointer hover:bg-slate-900/60 transition-colors ${
                    !n.isRead ? 'bg-cyan-950/20 border-l-2 border-cyan-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      n.severity === 'emergency' || n.severity === 'critical'
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                    }`}>
                      {n.severity}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-bold text-slate-200 text-xs truncate mb-1">{n.title}</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{n.message}</div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-[#1e293b] bg-[#0c1527] text-center">
            <button
              onClick={() => {
                setNavTab('alerts');
                setIsOpen(false);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1.5 w-full font-semibold py-1"
            >
              Open Threat Command Center <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
