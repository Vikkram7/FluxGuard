import React from 'react';
import { TelemetryData, MotorAsset, DiagnosticEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  HelpCircle,
  TrendingDown,
  Gauge,
  Thermometer,
  Zap,
  Info
} from 'lucide-react';

interface Props {
  telemetry: TelemetryData | null;
  asset: MotorAsset | null;
  events: DiagnosticEvent[];
}

export const DiagnosticAnalysisPage: React.FC<Props> = ({
  telemetry,
  asset,
  events
}) => {
  const state = telemetry?.diagnosticState ?? 'INITIALIZING';
  const residual = telemetry?.residualPct ?? 0;
  const confidence = telemetry?.confidencePct ?? 50;
  const uncertainty = telemetry?.uncertainty ?? 0.2;
  const reason = telemetry?.reasonCode ?? 'AWAITING_TELEMETRY';

  return (
    <div className="space-y-6">
      {/* Current Diagnostic Verdict Header */}
      <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Diagnostic Assessment & Evidence Evaluation
            </span>
            <div className="flex items-center gap-3">
              <StatusBadge state={state} size="lg" />
              <span className="text-sm font-mono text-slate-300">
                Confidence: <strong className="text-cyan-400">{confidence.toFixed(0)}%</strong>
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              Active Reason Code: <span className="text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{reason}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 text-xs font-mono space-y-1.5 min-w-[280px]">
            <div className="text-slate-400 flex justify-between">
              <span>Normalized Residual:</span>
              <span className={residual <= -5.0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {residual.toFixed(2)}%
              </span>
            </div>
            <div className="text-slate-400 flex justify-between">
              <span>Uncertainty Metric:</span>
              <span className="text-slate-200">{(uncertainty * 100).toFixed(0)}%</span>
            </div>
            <div className="text-slate-400 flex justify-between">
              <span>Operating Envelope:</span>
              <span className={telemetry?.speedRpm && telemetry.speedRpm > 60 ? 'text-emerald-400' : 'text-amber-400'}>
                {telemetry?.speedRpm && telemetry.speedRpm > 60 ? 'Observable (>43 RPM)' : 'Low Speed Cutoff'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Safety & Engineering Notice */}
      <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-200/90 space-y-1 leading-relaxed">
          <h4 className="font-semibold text-amber-300 font-mono uppercase tracking-wide">
            Engineering Honesty & Limitations Notice
          </h4>
          <p>
            The FluxGuard PMSM diagnostic engine classifies operating states based on observer residuals and mathematical models.
            <strong>"SUSPECTED_FLUX_DEGRADATION"</strong> denotes statistically significant, persistent negative flux residuals beyond the reversible thermal tolerance band.
            It does <strong>not</strong> provide absolute destructive proof of physical demagnetization on its own.
            Always confirm suspected degradation through secondary off-line validation methods (e.g. open-circuit back-EMF test at calibrated temperature or search coil measurement) before condemning a motor asset.
          </p>
        </div>
      </div>

      {/* Grid: Supporting Evidence & Known Confounding Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supporting Evidence Card */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Diagnostic Evidence Analysis
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1">
              <span className="font-semibold text-slate-200 font-mono">1. Residual Magnitude vs Calibrated Baseline:</span>
              <p className="text-slate-400 leading-relaxed">
                Current residual: <code className="text-cyan-400">{residual.toFixed(2)}%</code>.
                Fault entry threshold: <code className="text-rose-400">-5.0%</code>.
                Warning alert threshold: <code className="text-amber-400">-3.5%</code>.
                Recovery threshold (with hysteresis): <code className="text-emerald-400">-2.8%</code>.
              </p>
            </div>

            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1">
              <span className="font-semibold text-slate-200 font-mono">2. Thermal Compensation Status:</span>
              <p className="text-slate-400 leading-relaxed">
                Operating temperature is <code className="text-orange-400">{telemetry?.temperatureC?.toFixed(1) || 25}°C</code>.
                Model flux adjustment: <code className="text-slate-300">
                  {asset?.configuration ? (asset.configuration.alphaPsiPerK * 100).toFixed(2) : '-0.11'}%/K
                </code>.
                Because the residual is evaluated against <code className="text-cyan-300">ψ_healthy(T)</code>, reversible thermal demagnetization is fully accounted for.
              </p>
            </div>

            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1">
              <span className="font-semibold text-slate-200 font-mono">3. Persistence Debounce Progress:</span>
              <p className="text-slate-400 leading-relaxed">
                Demagnetization alarm requires continuous persistence across <code className="text-slate-300">1.5 seconds</code> (approx 30 consecutive samples at 20 Hz) to eliminate false trips from torque steps or acceleration transients.
              </p>
            </div>
          </div>
        </div>

        {/* Known Confounding Factors Card */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Known Confounding Factors & Mitigations
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1">
              <span className="font-semibold text-amber-300 font-mono">Stator Resistance (Rs) Thermal Drift:</span>
              <p className="text-slate-400 leading-relaxed">
                Copper resistance increases ~0.393%/K with temperature. At high torque (high i_q), uncompensated Rs increase creates an apparent drop in estimated back-EMF.
                <span className="block mt-1 text-slate-400 italic">Mitigation: Residual weight decreases under high resistive drop (low speed / high current).</span>
              </p>
            </div>

            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1">
              <span className="font-semibold text-amber-300 font-mono">Inverter Nonlinearity & Dead-Time:</span>
              <p className="text-slate-400 leading-relaxed">
                PWM dead-time introduces non-sinusoidal voltage distortions that shift voltage commands from true phase voltages.
                <span className="block mt-1 text-slate-400 italic">Mitigation: Enforced speed cutoff below 43 RPM where back-EMF is smaller than inverter forward drops.</span>
              </p>
            </div>

            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1">
              <span className="font-semibold text-amber-300 font-mono">Current Sensor DC Offset / Bias:</span>
              <p className="text-slate-400 leading-relaxed">
                Offset in phase current sensing propagates into d-q currents, corrupting the d-axis decoupling and q-axis flux equations.
                <span className="block mt-1 text-slate-400 italic">Mitigation: Power-on zero-current calibration and d-axis voltage cross-check residual monitor.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
