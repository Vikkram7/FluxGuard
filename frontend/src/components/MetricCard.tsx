import React from 'react';

interface Props {
  title: string;
  value: string | number;
  unit?: string;
  secondary?: string;
  status?: 'normal' | 'warning' | 'danger' | 'neutral';
  tooltip?: string;
}

export const MetricCard: React.FC<Props> = ({
  title,
  value,
  unit,
  secondary,
  status = 'neutral',
  tooltip
}) => {
  const statusBorder = {
    normal: 'border-emerald-500/30 hover:border-emerald-500/60',
    warning: 'border-amber-500/40 hover:border-amber-500/70',
    danger: 'border-rose-500/50 hover:border-rose-500/80 shadow-sm shadow-rose-950/40',
    neutral: 'border-slate-800 hover:border-slate-700'
  }[status];

  const valueColor = {
    normal: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
    neutral: 'text-slate-100'
  }[status];

  return (
    <div
      className={`bg-[#1C2541]/90 backdrop-blur border rounded-lg p-4 transition-all ${statusBorder}`}
      title={tooltip}
    >
      <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
        <span>{title}</span>
        {unit && <span className="font-mono text-slate-400 lowercase">{unit}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold font-mono tracking-tight ${valueColor}`}>
          {value}
        </span>
        {unit && <span className="text-sm font-mono text-slate-300">{unit}</span>}
      </div>
      {secondary && (
        <div className="mt-2 text-xs font-mono text-slate-300 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
          {secondary}
        </div>
      )}
    </div>
  );
};
