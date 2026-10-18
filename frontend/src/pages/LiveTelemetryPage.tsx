import React, { useState } from 'react';
import { TelemetryData } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  telemetryHistory: TelemetryData[];
  latestTelemetry: TelemetryData | null;
  onClearHistory: () => void;
}

export const LiveTelemetryPage: React.FC<Props> = ({
  telemetryHistory,
  latestTelemetry,
  onClearHistory
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [windowSeconds, setWindowSeconds] = useState(30);

  // Filter window based on seconds (assuming ~20 samples/s)
  const maxSamples = windowSeconds * 20;
  const displayHistory = telemetryHistory.slice(-maxSamples);

  const labels = displayHistory.map((d) => {
    const sec = ((d.timestampMs % 60000) / 1000).toFixed(1);
    return `${sec}s`;
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.4)' },
        ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.4)' },
        ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#cbd5e1', font: { family: 'monospace', size: 11 }, boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleFont: { family: 'monospace' },
        bodyFont: { family: 'monospace' }
      }
    }
  };

  // 1. Flux Comparison Chart: Estimated vs Healthy Reference
  const fluxChartData = {
    labels,
    datasets: [
      {
        label: 'Estimated Flux ψ̂f [mWb]',
        data: displayHistory.map((d) => d.estimatedFluxWb * 1000),
        borderColor: '#00F0FF',
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2
      },
      {
        label: 'Healthy Reference ψ_healthy(T) [mWb]',
        data: displayHistory.map((d) => d.healthyReferenceFluxWb * 1000),
        borderColor: '#10B981',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      }
    ]
  };

  // 2. Normalized Residual Chart with Warning & Fault Thresholds
  const residualChartData = {
    labels,
    datasets: [
      {
        label: 'Normalized Residual r_ψ [%]',
        data: displayHistory.map((d) => d.residualPct),
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
        fill: true
      },
      {
        label: 'Warning Threshold (-3.5%)',
        data: displayHistory.map(() => -3.5),
        borderColor: '#F59E0B',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0
      },
      {
        label: 'Fault Threshold (-5.0%)',
        data: displayHistory.map(() => -5.0),
        borderColor: '#EF4444',
        borderDash: [4, 4],
        borderWidth: 2,
        pointRadius: 0
      }
    ]
  };

  // 3. Speed & Temperature Chart
  const speedTempChartData = {
    labels,
    datasets: [
      {
        label: 'Speed [RPM]',
        data: displayHistory.map((d) => d.speedRpm),
        borderColor: '#A855F7',
        borderWidth: 1.8,
        pointRadius: 0,
        yAxisID: 'y'
      },
      {
        label: 'Temperature [°C]',
        data: displayHistory.map((d) => d.temperatureC),
        borderColor: '#F97316',
        borderWidth: 1.8,
        pointRadius: 0,
        yAxisID: 'y1'
      }
    ]
  };

  const dualAxisOptions = {
    ...chartOptions,
    scales: {
      x: chartOptions.scales.x,
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Speed [RPM]', color: '#A855F7' },
        grid: { color: 'rgba(51, 65, 85, 0.4)' },
        ticks: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'Temp [°C]', color: '#F97316' },
        grid: { drawOnChartArea: false },
        ticks: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } }
      }
    }
  };

  // 4. Currents and Voltages Chart
  const electricalChartData = {
    labels,
    datasets: [
      {
        label: 'i_q [A]',
        data: displayHistory.map((d) => d.iqA),
        borderColor: '#10B981',
        borderWidth: 1.5,
        pointRadius: 0
      },
      {
        label: 'i_d [A]',
        data: displayHistory.map((d) => d.idA),
        borderColor: '#64748B',
        borderWidth: 1.5,
        pointRadius: 0
      },
      {
        label: 'v_q [V]',
        data: displayHistory.map((d) => d.vqV),
        borderColor: '#00F0FF',
        borderWidth: 1.5,
        pointRadius: 0
      },
      {
        label: 'v_d [V]',
        data: displayHistory.map((d) => d.vdV),
        borderColor: '#E2E8F0',
        borderWidth: 1.2,
        pointRadius: 0
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              isPaused
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'RESUME STREAM' : 'PAUSE STREAM'}</span>
          </button>

          <button
            onClick={onClearHistory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET BUFFER</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Window:</span>
          {[15, 30, 60].map((sec) => (
            <button
              key={sec}
              onClick={() => setWindowSeconds(sec)}
              className={`px-2.5 py-1 rounded transition-all ${
                windowSeconds === sec
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-700 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sec}s
            </button>
          ))}
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Buffered: {telemetryHistory.length} frames</span>
        </div>
      </div>

      {/* Primary Charts: 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Estimated vs Reference Flux */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">
              PM Flux Linkage: Estimated vs Reference
            </h3>
            <span className="text-xs font-mono text-cyan-400">
              {latestTelemetry ? (latestTelemetry.estimatedFluxWb * 1000).toFixed(2) : '--'} mWb
            </span>
          </div>
          <div className="h-64">
            <Line data={fluxChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 2: Normalized Residual with Thresholds */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">
              Normalized Flux Residual r_ψ [%]
            </h3>
            <span className={`text-xs font-mono font-bold ${
              (latestTelemetry?.residualPct ?? 0) <= -5.0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {latestTelemetry?.residualPct !== undefined ? `${latestTelemetry.residualPct.toFixed(2)}%` : '--'}
            </span>
          </div>
          <div className="h-64">
            <Line data={residualChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 3: Speed & Temperature Dynamics */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">
              Rotor Speed & Thermal Envelope
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {latestTelemetry ? `${latestTelemetry.speedRpm.toFixed(0)} RPM | ${latestTelemetry.temperatureC.toFixed(1)}°C` : '--'}
            </span>
          </div>
          <div className="h-64">
            <Line data={speedTempChartData} options={dualAxisOptions} />
          </div>
        </div>

        {/* Chart 4: d-q Axis Voltages and Currents */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">
              Electrical States: d-q Currents & Voltages
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {latestTelemetry ? `iq: ${latestTelemetry.iqA.toFixed(2)} A | vq: ${latestTelemetry.vqV.toFixed(1)} V` : '--'}
            </span>
          </div>
          <div className="h-64">
            <Line data={electricalChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};
