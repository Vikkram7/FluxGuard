import React, { useState } from 'react';
import { SimulationParams, TestSession } from '../types';
import { startSimulation, stopSimulation } from '../api';
import { PlaySquare, Square, RefreshCw, Zap, Sliders, AlertTriangle } from 'lucide-react';

interface Props {
  assetId: number;
  isSimRunning: boolean;
  onSimulationStatusChange: (running: boolean) => void;
}

export const TestBenchPage: React.FC<Props> = ({
  assetId,
  isSimRunning,
  onSimulationStatusChange
}) => {
  const [scenario, setScenario] = useState<string>('synthetic_flux_reduction_10pct');
  const [speed, setSpeed] = useState<number>(1500);
  const [torque, setTorque] = useState<number>(2.0);
  const [temp, setTemp] = useState<number>(25);
  const [demagPct, setDemagPct] = useState<number>(10.0);
  const [offsetA, setOffsetA] = useState<number>(0.0);
  const [noiseV, setNoiseV] = useState<number>(0.2);
  const [duration, setDuration] = useState<number>(30);
  const [seed, setSeed] = useState<number>(42);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<TestSession | null>(null);

  const predefinedScenarios = [
    { id: 'healthy_constant', name: '1. Healthy Baseline (1500 RPM, 2.5 Nm, 25°C)', speed: 1500, torque: 2.5, temp: 25, demag: 0, noise: 0.1, offset: 0 },
    { id: 'reversible_temp_sweep', name: '2. Reversible Thermal Sweep (25°C → 85°C)', speed: 1600, torque: 2.0, temp: 75, demag: 0, noise: 0.1, offset: 0 },
    { id: 'synthetic_flux_reduction_5pct', name: '3. Synthetic Demagnetization: -5% Step', speed: 1500, torque: 2.0, temp: 40, demag: 5.0, noise: 0.2, offset: 0 },
    { id: 'synthetic_flux_reduction_10pct', name: '4. Synthetic Demagnetization: -10% Step', speed: 1500, torque: 2.0, temp: 40, demag: 10.0, noise: 0.2, offset: 0 },
    { id: 'synthetic_flux_reduction_15pct', name: '5. Synthetic Demagnetization: -15% Step', speed: 1500, torque: 2.0, temp: 40, demag: 15.0, noise: 0.2, offset: 0 },
    { id: 'current_offset_error', name: '6. Current Sensor Offset Error (+0.75 A)', speed: 1500, torque: 2.0, temp: 30, demag: 0, noise: 0.2, offset: 0.75 },
    { id: 'low_speed_rejection', name: '7. Low-Speed Observability Rejection (35 RPM)', speed: 35, torque: 0.5, temp: 25, demag: 0, noise: 0.1, offset: 0 },
  ];

  const handleSelectScenario = (id: string) => {
    setScenario(id);
    const found = predefinedScenarios.find((s) => s.id === id);
    if (found) {
      setSpeed(found.speed);
      setTorque(found.torque);
      setTemp(found.temp);
      setDemagPct(found.demag);
      setNoiseV(found.noise);
      setOffsetA(found.offset);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const params: SimulationParams = {
        assetId,
        scenarioName: scenario,
        targetSpeedRpm: speed,
        loadTorqueNm: torque,
        temperatureC: temp,
        demagnetizationPct: demagPct,
        currentOffsetA: offsetA,
        voltageNoiseV: noiseV,
        tempBiasC: 0.0,
        durationSeconds: duration,
        randomSeed: seed
      };
      const session = await startSimulation(params);
      setActiveSession(session);
      onSimulationStatusChange(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopSimulation();
      onSimulationStatusChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <PlaySquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-tight text-white">
              Synthetic PMSM Diagnostic Test Bench
            </h1>
            <p className="text-xs text-slate-400">
              Inject synthetic speed/load profiles, thermal excursions, sensor faults, and controlled flux loss.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSimRunning ? (
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-rose-950/40"
            >
              <Square className="w-3.5 h-3.5" />
              <span>STOP EXPERIMENT</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>RUN EXPERIMENT</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Scenario Selector */}
      <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400">
          Preset Standardized Scenarios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          {predefinedScenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc.id)}
              className={`text-left p-3 rounded-lg border transition-all ${
                scenario === sc.id
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold text-slate-200">{sc.name}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Speed: {sc.speed} RPM | Load: {sc.torque} Nm | Temp: {sc.temp}°C | Demag: {sc.demag}%
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Parameter Sliders */}
      <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400">
            Interactive Test Bench Controls & Injections
          </h2>
          <span className="text-xs font-mono text-slate-400">Random Seed: #{seed}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
          {/* Target Speed Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Target Speed</span>
              <span className="text-cyan-400 font-bold">{speed} RPM</span>
            </div>
            <input
              type="range"
              min="0"
              max="3500"
              step="50"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-900"
            />
          </div>

          {/* Load Torque Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Load Torque</span>
              <span className="text-cyan-400 font-bold">{torque.toFixed(1)} N·m</span>
            </div>
            <input
              type="range"
              min="0"
              max="5.0"
              step="0.1"
              value={torque}
              onChange={(e) => setTorque(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-900"
            />
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Rotor Temperature</span>
              <span className="text-orange-400 font-bold">{temp}°C</span>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              step="1"
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
              className="w-full accent-orange-400 bg-slate-900"
            />
          </div>

          {/* Synthetic Demagnetization Fault Injection Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-rose-300 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Synthetic Flux Reduction Step (t ≥ 8s)</span>
              </span>
              <span className="text-rose-400 font-bold">-{demagPct.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20.0"
              step="0.5"
              value={demagPct}
              onChange={(e) => setDemagPct(Number(e.target.value))}
              className="w-full accent-rose-500 bg-slate-900"
            />
          </div>

          {/* Current Offset Injection */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Sensor DC Bias Offset</span>
              <span className="text-purple-400 font-bold">+{offsetA.toFixed(2)} A</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={offsetA}
              onChange={(e) => setOffsetA(Number(e.target.value))}
              className="w-full accent-purple-400 bg-slate-900"
            />
          </div>

          {/* Voltage Measurement Noise */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Voltage Measurement Noise (std dev)</span>
              <span className="text-cyan-400 font-bold">{noiseV.toFixed(2)} V</span>
            </div>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.1"
              value={noiseV}
              onChange={(e) => setNoiseV(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
