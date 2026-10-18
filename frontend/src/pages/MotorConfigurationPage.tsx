import React, { useState, useEffect } from 'react';
import { MotorConfiguration } from '../types';
import { updateConfiguration } from '../api';
import { Sliders, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  assetId: number;
  initialConfig: MotorConfiguration | null;
  onConfigSaved: (config: MotorConfiguration) => void;
}

export const MotorConfigurationPage: React.FC<Props> = ({
  assetId,
  initialConfig,
  onConfigSaved
}) => {
  const [form, setForm] = useState<Partial<MotorConfiguration>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setForm(initialConfig);
    }
  }, [initialConfig]);

  const handleChange = (field: keyof MotorConfiguration, val: string | number) => {
    setForm((prev) => ({
      ...prev,
      [field]: typeof val === 'string' ? parseFloat(val) : val
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const saved = await updateConfiguration(assetId, form);
      onConfigSaved(saved);
      setSuccessMsg('Motor parameters and diagnostic thresholds updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title & Info Banner */}
      <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-tight text-white">
              Motor Calibration & Diagnostic Threshold Configuration
            </h1>
            <p className="text-xs text-slate-400">
              Calibrated model parameters used by the voltage estimator and temperature compensator.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-300 font-mono">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-4 flex items-center gap-3 text-xs text-rose-300 font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Electromagnetic Parameters */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
            1. Electromagnetic & Thermal Model Parameters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Pole Pairs (p)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={form.polePairs ?? 4}
                onChange={(e) => handleChange('polePairs', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Stator Resistance Rs (Ω)</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={form.statorResistanceRs ?? 0.45}
                onChange={(e) => handleChange('statorResistanceRs', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">d-axis Inductance Ld (H)</label>
              <input
                type="number"
                step="0.0001"
                min="0.00001"
                value={form.dAxisInductanceLd ?? 0.0035}
                onChange={(e) => handleChange('dAxisInductanceLd', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">q-axis Inductance Lq (H)</label>
              <input
                type="number"
                step="0.0001"
                min="0.00001"
                value={form.qAxisInductanceLq ?? 0.0035}
                onChange={(e) => handleChange('qAxisInductanceLq', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Nominal Flux ψ_ref (Wb)</label>
              <input
                type="number"
                step="0.0001"
                min="0.001"
                value={form.referenceFluxWb ?? 0.0850}
                onChange={(e) => handleChange('referenceFluxWb', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Ref Temperature T_ref (°C)</label>
              <input
                type="number"
                step="0.1"
                value={form.referenceTemperatureC ?? 20.0}
                onChange={(e) => handleChange('referenceTemperatureC', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Thermal Coeff α_ψ (1/K)</label>
              <input
                type="number"
                step="0.0001"
                max="-0.00001"
                value={form.alphaPsiPerK ?? -0.0011}
                onChange={(e) => handleChange('alphaPsiPerK', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Calibrated Diagnostic Thresholds */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
            2. Calibrated Diagnostic Thresholds & Debounce Timing
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Warning Threshold (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.warningThresholdPct ?? -3.5}
                onChange={(e) => handleChange('warningThresholdPct', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-amber-300 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Fault Threshold (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.faultThresholdPct ?? -5.0}
                onChange={(e) => handleChange('faultThresholdPct', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-rose-300 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Recovery Threshold (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.recoveryThresholdPct ?? -2.8}
                onChange={(e) => handleChange('recoveryThresholdPct', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-emerald-300 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Persistence Duration (s)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={form.persistenceDurationS ?? 1.5}
                onChange={(e) => handleChange('persistenceDurationS', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'UPDATING...' : 'SAVE CALIBRATION'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
