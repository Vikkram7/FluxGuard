import React, { useState, useEffect, useRef } from 'react';
import { TelemetryData, MotorAsset, DiagnosticEvent, MotorConfiguration } from './types';
import {
  fetchAssets,
  fetchAsset,
  fetchRecentTelemetry,
  fetchDiagnosticEvents,
  createWebSocketConnection,
  fetchSimulationStatus
} from './api';
import { Navbar, PageId } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveTelemetryPage } from './pages/LiveTelemetryPage';
import { DiagnosticAnalysisPage } from './pages/DiagnosticAnalysisPage';
import { MotorConfigurationPage } from './pages/MotorConfigurationPage';
import { TestBenchPage } from './pages/TestBenchPage';
import { ExperimentReportsPage } from './pages/ExperimentReportsPage';
import { HardwareConnectionPage } from './pages/HardwareConnectionPage';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(true);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);

  const [asset, setAsset] = useState<MotorAsset | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryData[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryData | null>(null);
  const [recentEvents, setRecentEvents] = useState<DiagnosticEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Load initial asset & configuration
  useEffect(() => {
    async function loadInitial() {
      try {
        const assets = await fetchAssets();
        if (assets.length > 0) {
          const current = assets[0];
          setAsset(current);
          const history = await fetchRecentTelemetry(current.id, 60);
          setTelemetryHistory(history.reverse());
          if (history.length > 0) {
            setLatestTelemetry(history[history.length - 1]);
          }
          const events = await fetchDiagnosticEvents(current.id);
          setRecentEvents(events);
        }
      } catch (e) {
        console.error('Failed to load initial asset', e);
      }
    }
    loadInitial();
  }, []);

  // 2. Connect WebSocket for live streaming
  useEffect(() => {
    function connect() {
      const ws = createWebSocketConnection(
        (data: TelemetryData) => {
          setLatestTelemetry(data);
          setTelemetryHistory((prev) => {
            const next = [...prev, data];
            if (next.length > 1200) next.shift(); // Keep last 1200 points
            return next;
          });
        },
        (connected: boolean) => {
          setIsWsConnected(connected);
        }
      );
      wsRef.current = ws;
    }

    connect();

    // Fallback polling if WebSocket is offline
    const pollInterval = setInterval(async () => {
      if (!isWsConnected && asset) {
        try {
          const recent = await fetchRecentTelemetry(asset.id, 10);
          if (recent.length > 0) {
            const latest = recent[0];
            setLatestTelemetry(latest);
            setTelemetryHistory((prev) => {
              if (prev.length === 0 || prev[prev.length - 1].timestampMs !== latest.timestampMs) {
                return [...prev, latest].slice(-1200);
              }
              return prev;
            });
          }
          const status = await fetchSimulationStatus();
          setIsSimRunning(status.running);
        } catch (ignored) {}
      }
    }, 1500);

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [asset?.id, isWsConnected]);

  // Handle configuration update
  const handleConfigSaved = (updatedConfig: MotorConfiguration) => {
    if (asset) {
      setAsset({
        ...asset,
        configuration: updatedConfig
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B] flex flex-col text-slate-100">
      <Navbar
        activePage={activePage}
        onSelectPage={setActivePage}
        isWsConnected={isWsConnected}
        isSimulatedMode={isSimulatedMode}
        assetTag={asset?.assetTag || 'PMSM-SPM-4P-01'}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activePage === 'overview' && (
          <OverviewPage
            telemetry={latestTelemetry}
            asset={asset}
            recentEvents={recentEvents}
            onNavigateToTelemetry={() => setActivePage('telemetry')}
            onNavigateToDiagnostics={() => setActivePage('diagnostics')}
          />
        )}

        {activePage === 'telemetry' && (
          <LiveTelemetryPage
            telemetryHistory={telemetryHistory}
            latestTelemetry={latestTelemetry}
            onClearHistory={() => setTelemetryHistory([])}
          />
        )}

        {activePage === 'diagnostics' && (
          <DiagnosticAnalysisPage
            telemetry={latestTelemetry}
            asset={asset}
            events={recentEvents}
          />
        )}

        {activePage === 'config' && (
          <MotorConfigurationPage
            assetId={asset?.id || 1}
            initialConfig={asset?.configuration || null}
            onConfigSaved={handleConfigSaved}
          />
        )}

        {activePage === 'testbench' && (
          <TestBenchPage
            assetId={asset?.id || 1}
            isSimRunning={isSimRunning}
            onSimulationStatusChange={setIsSimRunning}
          />
        )}

        {activePage === 'reports' && <ExperimentReportsPage />}

        {activePage === 'hardware' && (
          <HardwareConnectionPage
            isSimulatedMode={isSimulatedMode}
            onToggleMode={setIsSimulatedMode}
            lastPacketTimestamp={latestTelemetry?.timestampMs}
          />
        )}
      </main>

      <footer className="bg-[#0B132B] border-t border-slate-800/80 py-4 text-xs font-mono text-slate-500 text-center">
        FluxGuard PMSM &mdash; Physics-Based Permanent Magnet Flux Degradation Monitoring System &bull; Final Year Engineering Project
      </footer>
    </div>
  );
};
