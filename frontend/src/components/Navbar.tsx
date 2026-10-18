import React from 'react';
import {
  Activity,
  Gauge,
  Sliders,
  PlaySquare,
  FileSpreadsheet,
  Cpu,
  Radio,
  Zap
} from 'lucide-react';

export type PageId = 'overview' | 'telemetry' | 'diagnostics' | 'config' | 'testbench' | 'reports' | 'hardware';

interface Props {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  isWsConnected: boolean;
  isSimulatedMode: boolean;
  assetTag: string;
}

export const Navbar: React.FC<Props> = ({
  activePage,
  onSelectPage,
  isWsConnected,
  isSimulatedMode,
  assetTag
}) => {
  const navItems: { id: PageId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'telemetry', label: 'Live Telemetry', icon: Gauge },
    { id: 'diagnostics', label: 'Diagnostic Analysis', icon: Radio },
    { id: 'config', label: 'Configuration', icon: Sliders },
    { id: 'testbench', label: 'Test Bench', icon: PlaySquare },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'hardware', label: 'Hardware Link', icon: Cpu },
  ];

  return (
    <header className="bg-[#0B132B] border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Product Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white font-mono">FluxGuard</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">PMSM</span>
              </div>
              <span className="text-[11px] text-slate-400 block -mt-1 font-mono">Permanent-Magnet Degradation Diagnostic Engine</span>
            </div>
          </div>

          {/* Center Tabs */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectPage(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm shadow-cyan-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Indicators */}
          <div className="flex items-center gap-3">
            {/* Asset tag */}
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 hidden lg:inline-block">
              {assetTag}
            </span>

            {/* Mode badge */}
            <span
              className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${
                isSimulatedMode
                  ? 'bg-amber-950/60 text-amber-400 border-amber-700/50'
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-700/50'
              }`}
            >
              {isSimulatedMode ? 'SIMULATED DATA' : 'HARDWARE LINK'}
            </span>

            {/* WebSocket connection dot */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{isWsConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
