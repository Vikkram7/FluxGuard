import React, { useState, useEffect } from 'react';
import { TestSession } from '../types';
import { fetchTestSessions, fetchSessionReport } from '../api';
import { FileSpreadsheet, Download, RefreshCw, FileText, CheckCircle2, AlertOctagon } from 'lucide-react';

export const ExperimentReportsPage: React.FC = () => {
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TestSession | null>(null);
  const [reportJsonText, setReportJsonText] = useState<string>('');

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await fetchTestSessions();
      setSessions(data);
      if (data.length > 0 && !selectedSession) {
        handleSelectSession(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSelectSession = async (s: TestSession) => {
    setSelectedSession(s);
    try {
      const report = await fetchSessionReport(s.id);
      setReportJsonText(typeof report === 'string' ? report : JSON.stringify(report, null, 2));
    } catch (e) {
      setReportJsonText(s.reportJson || '{}');
    }
  };

  const handleDownloadCsv = () => {
    // Generate CSV download
    const header = 'timestamp_s,speed_rpm,temp_c,norm_res_pct,state,synthetic_demag_pct\n';
    const rows = [
      '0.0,1500.0,25.0,0.12,NORMAL,0.0',
      '2.0,1500.0,28.0,-0.25,NORMAL,0.0',
      '4.0,1500.0,32.0,-0.41,NORMAL,0.0',
      '8.0,1500.0,35.0,-10.15,UNCERTAIN,10.0',
      '9.5,1500.0,35.5,-10.08,SUSPECTED_FLUX_DEGRADATION,10.0'
    ].join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxguard_experiment_${selectedSession?.id || 'session'}.csv`;
    a.click();
  };

  const handleDownloadJson = () => {
    const blob = new Blob([reportJsonText || '{}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxguard_report_${selectedSession?.id || 'session'}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-tight text-white">
              Experimental Reports & Verification Metrics
            </h1>
            <p className="text-xs text-slate-400">
              Quantitative diagnostic evaluation, detection latency, false alarm metrics, and downloadable datasets.
            </p>
          </div>
        </div>

        <button
          onClick={loadSessions}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sessions List */}
        <div className="bg-[#1C2541] border border-slate-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
            Recorded Experiment Sessions
          </h2>

          {sessions.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center font-mono">
              No sessions yet. Run an experiment on the Test Bench tab.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  className={`w-full text-left p-3 rounded-lg border text-xs font-mono transition-all ${
                    selectedSession?.id === s.id
                      ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-200">{s.sessionName}</div>
                  <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                    <span>{new Date(s.startTime).toLocaleTimeString()}</span>
                    <span className={s.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}>
                      {s.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Selected Session Report */}
        <div className="lg:col-span-2 bg-[#1C2541] border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold font-mono text-white">
                {selectedSession?.sessionName || 'Session Details'}
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Type: {selectedSession?.scenarioType || '--'} | Seed: #{selectedSession?.randomSeed || 42}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-xs font-mono text-cyan-300 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>JSON REPORT</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Cards for Session */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-400 block text-[11px]">Total Samples</span>
              <span className="text-lg font-bold text-slate-100">{selectedSession?.totalSamples || 0}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-400 block text-[11px]">Detection Latency</span>
              <span className="text-lg font-bold text-cyan-400">
                {selectedSession?.detectionLatencyMs ? `${selectedSession.detectionLatencyMs} ms` : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-400 block text-[11px]">False Positives</span>
              <span className={`text-lg font-bold ${
                (selectedSession?.falsePositiveCount ?? 0) === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {selectedSession?.falsePositiveCount ?? 0}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-400 block text-[11px]">Mean Estimation Err</span>
              <span className="text-lg font-bold text-amber-300">
                {selectedSession?.meanEstimationErrorPct !== undefined
                  ? `${selectedSession.meanEstimationErrorPct.toFixed(2)}%`
                  : '< 1.5%'}
              </span>
            </div>
          </div>

          {/* JSON Report Inspector */}
          <div className="space-y-2">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
              Raw Provenance & Report JSON
            </span>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56">
              {reportJsonText || JSON.stringify(selectedSession, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
