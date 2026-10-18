import React from 'react';
import { TelemetryData, MotorAsset, DiagnosticEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { AlertCircle, ShieldAlert, CheckCircle, Info, ExternalLink } from 'lucide-react';

interface Props {
  telemetry: TelemetryData | null;
  asset: MotorAsset | null;
  recentEvents: DiagnosticEvent[];
  onNavigateToTelemetry: () => void;
  onNavigateToDiagnostics: () => void;
}

export const OverviewPage: React.FC<Props> = ({
  telemetry,
  asset,
  recentEvents,
  onNavigateToTelemetry,
  onNavigateToDiagnostics
}) => {
  const currentSpeed = telemetry?.speedRpm ?? 0;
  const currentTemp = telemetry?.temperatureC ?? 20;
  const estimatedFlux = telemetry?.estimatedFluxWb ? (telemetry.estimatedFluxWb * 1000).toFixed(2) : '--';
  const healthyFlux = telemetry?.healthyReferenceFluxWb ? (telemetry.healthyReferenceFluxWb * 1000).toFixed(2) : '--';
  const residualPct = telemetry?.residualPct !== undefined ? telemetry.residualPct.toFixed(2) : '--';
  const state = telemetry?.diagnosticState ?? 'INITIALIZING';
  const uncertainty = telemetry?.uncertainty !== undefined ? (telemetry.uncertainty * 100).toFixed(0) : '--';

  const residualNum = telemetry?.residualPct ?? 0;
  let resStatus: 'normal' | 'warning' | 'danger' | 'neutral' = 'normal';
  if (residualNum <= -5.0) resStatus = 'danger';
  else if (residualNum <= -3.5) resStatus = 'warning';

  const lastEvent = recentEvents.length > 0 ? recentEvents[0] : null;

  return (
    <div className="space-y-6">
      {/* Top Banner: Diagnostic Summary & Operating Mode */}
      <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono tracking-tight text-white">
              {asset?.modelName || 'FluxGuard PMSM Demonstration Asset'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Tag: {asset?.assetTag || 'PMSM-01'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time rotor-oriented flux estimation with temperature compensation & state verification
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">Current Diagnostic Status</span>
            <div className="mt-1">
              <StatusBadge state={state} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Main 6 Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Rotor Speed"
          value={currentSpeed.toFixed(0)}
          unit="RPM"
          secondary={`Rated: ${asset?.ratedSpeedRpm || 3000} RPM`}
          status={currentSpeed < 60 ? 'warning' : 'normal'}
          tooltip="Mechanical rotor speed from encoder"
        />

        <MetricCard
          title="Magnet Temp"
          value={currentTemp.toFixed(1)}
          unit="°C"
          secondary={`Ref: ${asset?.configuration?.referenceTemperatureC || 20} °C`}
          status={currentTemp > 90 ? 'warning' : 'normal'}
          tooltip="Permanent magnet surface temperature"
        />

        <MetricCard
          title="Estimated Flux"
          value={estimatedFlux}
          unit="mWb"
          secondary="Voltage Model ψ̂f"
          status="neutral"
          tooltip="Real-time estimated PM flux linkage"
        />

        <MetricCard
          title="Healthy Flux"
          value={healthyFlux}
          unit="mWb"
          secondary="Temp-Adjusted ψ(T)"
          status="neutral"
          tooltip="Healthy model flux compensated for temperature"
        />

        <MetricCard
          title="Norm. Residual"
          value={residualPct}
          unit="%"
          secondary="Threshold: -5.0%"
          status={resStatus}
          tooltip="Percentage deviation relative to healthy temperature model"
        />

        <MetricCard
          title="Uncertainty"
          value={uncertainty}
          unit="%"
          secondary="Quality: Good"
          status={Number(uncertainty) > 60 ? 'warning' : 'normal'}
          tooltip="Normalized measurement uncertainty index"
        />
      </div>

      {/* Warning Alert if degradation suspected */}
      {state === 'SUSPECTED_FLUX_DEGRADATION' && (
        <div className="bg-rose-950/80 border border-rose-500/70 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-rose-950/30">
          <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5 shrink-0 animate-bounce" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-300 font-mono">
              PERMANENT-MAGNET FLUX DEGRADATION SUSPECTED
            </h3>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              The normalized flux residual has persistently exceeded the calibrated demagnetization threshold (-5.0%) beyond the persistence window.
              Reason code: <span className="font-mono underline">{telemetry?.reasonCode}</span>.
              <strong className="block mt-1 text-rose-300">
                Safety Note: This diagnostic system identifies suspected degradation. Independent confirmation via locked-rotor back-EMF or search coil is required prior to motor overhaul.
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* Two Column Section: Diagnostic Event Log & Quick Architecture Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Diagnostic Events */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Recent Diagnostic Transitions
              </h2>
            </div>
            <button
              onClick={onNavigateToDiagnostics}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
            >
              <span>Full Analysis</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-300 font-mono">
              No state transitions recorded. Motor operating in steady state.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {recentEvents.slice(0, 5).map((evt) => (
                <div
                  key={evt.id}
                  className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 text-xs flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-slate-400 font-mono">{evt.previousState} →</span>
                      <StatusBadge state={evt.newState} size="sm" />
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      Residual: {evt.residualPct?.toFixed(2)}% | Reason: {evt.reasonCode}
                    </div>
                  </div>
                  <div className="text-right font-mono text-slate-400 text-[11px]">
                    Confidence: {evt.confidencePct?.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Physics-Based Diagnostic Principles Info Box */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Physics Principles & Verification
              </h2>
            </div>
            <button
              onClick={onNavigateToTelemetry}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
            >
              <span>Live Telemetry</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="font-semibold text-cyan-300 font-mono block mb-1">
                1. Reversible Thermal Tracking:
              </span>
              Calculates <code className="text-emerald-300">ψ_healthy(T) = ψ_ref·[1 + α_ψ·(T - T_ref)]</code> where α_ψ = -0.11%/K. Prevents false demagnetization alerts when the motor warms up under heavy continuous load.
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="font-semibold text-cyan-300 font-mono block mb-1">
                2. Persistence Debounce & Hysteresis:
              </span>
              Distinguishes transient torque steps from genuine permanent demagnetization by requiring a 1.5s persistence window and 2.2% hysteresis band.
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="font-semibold text-cyan-300 font-mono block mb-1">
                3. Low-Speed Observability Boundary:
              </span>
              Rejects flux estimates when electrical speed falls below 18 rad/s (~43 RPM) to eliminate division-by-near-zero instability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
