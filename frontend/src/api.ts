import {
  MotorAsset,
  MotorConfiguration,
  TelemetryData,
  DiagnosticEvent,
  TestSession,
  SimulationParams
} from './types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchAssets(): Promise<MotorAsset[]> {
  const res = await fetch(`${API_BASE}/assets`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchAsset(id: number): Promise<MotorAsset> {
  const res = await fetch(`${API_BASE}/assets/${id}`);
  const json = await res.json();
  return json.data;
}

export async function fetchConfiguration(assetId: number): Promise<MotorConfiguration> {
  const res = await fetch(`${API_BASE}/assets/${assetId}/configuration`);
  const json = await res.json();
  return json.data;
}

export async function updateConfiguration(assetId: number, config: Partial<MotorConfiguration>): Promise<MotorConfiguration> {
  const res = await fetch(`${API_BASE}/assets/${assetId}/configuration`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const errorJson = await res.json();
    throw new Error(errorJson.message || 'Failed to update configuration');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchRecentTelemetry(assetId: number, limit = 60): Promise<TelemetryData[]> {
  const res = await fetch(`${API_BASE}/telemetry/recent?assetId=${assetId}&limit=${limit}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchDiagnosticEvents(assetId: number): Promise<DiagnosticEvent[]> {
  const res = await fetch(`${API_BASE}/assets/${assetId}/diagnostics`);
  const json = await res.json();
  return json.data || [];
}

export async function startSimulation(params: SimulationParams): Promise<TestSession> {
  const res = await fetch(`${API_BASE}/simulation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const json = await res.json();
  return json.data;
}

export async function stopSimulation(): Promise<void> {
  await fetch(`${API_BASE}/simulation/stop`, { method: 'POST' });
}

export async function fetchSimulationStatus(): Promise<{ running: boolean }> {
  const res = await fetch(`${API_BASE}/simulation/status`);
  const json = await res.json();
  return json.data || { running: false };
}

export async function fetchTestSessions(): Promise<TestSession[]> {
  const res = await fetch(`${API_BASE}/test-sessions`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchSessionReport(id: number): Promise<string> {
  const res = await fetch(`${API_BASE}/test-sessions/${id}/report`);
  const json = await res.json();
  return json.data || '{}';
}

export function createWebSocketConnection(
  onData: (data: TelemetryData) => void,
  onStatusChange: (connected: boolean) => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws/telemetry`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => onStatusChange(true);
  ws.onclose = () => onStatusChange(false);
  ws.onerror = () => onStatusChange(false);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as TelemetryData;
      onData(data);
    } catch (e) {
      console.error('Failed to parse telemetry frame', e);
    }
  };

  return ws;
}
