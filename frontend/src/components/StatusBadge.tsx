import React from 'react';
import { DiagnosticState } from '../types';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, Activity, Disc } from 'lucide-react';

interface Props {
  state?: DiagnosticState | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<Props> = ({ state = 'INITIALIZING', size = 'md' }) => {
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  let dot = 'bg-slate-400';
  let Icon = Activity;
  let label = state;

  switch (state) {
    case 'NORMAL':
      bg = 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-900/30';
      dot = 'bg-emerald-400';
      Icon = CheckCircle2;
      label = 'NORMAL';
      break;
    case 'SUSPECTED_FLUX_DEGRADATION':
      bg = 'bg-rose-950/90 text-rose-400 border-rose-500/60 shadow-md shadow-rose-950/50 animate-pulse';
      dot = 'bg-rose-500';
      Icon = AlertOctagon;
      label = 'SUSPECTED FLUX DEGRADATION';
      break;
    case 'UNCERTAIN':
      bg = 'bg-amber-950/80 text-amber-400 border-amber-500/50 shadow-sm shadow-amber-900/30';
      dot = 'bg-amber-400';
      Icon = AlertTriangle;
      label = 'UNCERTAIN';
      break;
    case 'INSUFFICIENT_DATA':
      bg = 'bg-slate-900 text-sky-400 border-sky-600/40';
      dot = 'bg-sky-400';
      Icon = Disc;
      label = 'INSUFFICIENT DATA';
      break;
    case 'SENSOR_FAULT':
      bg = 'bg-purple-950/80 text-purple-400 border-purple-500/50';
      dot = 'bg-purple-400';
      Icon = AlertTriangle;
      label = 'SENSOR FAULT';
      break;
    case 'INITIALIZING':
    default:
      bg = 'bg-cyan-950/60 text-cyan-400 border-cyan-500/40';
      dot = 'bg-cyan-400';
      Icon = Activity;
      label = 'INITIALIZING';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
  }[size];

  return (
    <span className={`inline-flex items-center rounded-md border tracking-wide uppercase font-mono ${bg} ${sizeClasses}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </span>
  );
};
