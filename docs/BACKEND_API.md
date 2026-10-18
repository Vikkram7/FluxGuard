# Backend REST API & Real-Time Telemetry Specification

The **FluxGuard PMSM** backend is implemented in Java 21 using Spring Boot 3.3. It exposes structured REST endpoints, Server-Sent Events (SSE), and a low-latency WebSocket connection for real-time telemetry streaming.

## 1. System Health
### `GET /api/health`
Returns system status, active database dialect, and server timestamp.

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "System healthy",
  "data": {
    "status": "UP",
    "system": "FluxGuard PMSM Diagnostic Core",
    "version": "1.0.0",
    "timestamp": "2026-10-18T20:00:00Z"
  },
  "timestamp": "2026-10-18T20:00:00Z"
}
```

---

## 2. Motor Asset Management
### `GET /api/assets`
Fetches all registered motor assets.

### `GET /api/assets/{id}`
Fetches a specific motor asset including its configuration and calibration profile.

### `GET /api/assets/{id}/configuration`
Returns the calibrated electromagnetic and threshold parameters.

### `PUT /api/assets/{id}/configuration`
Updates calibrated motor parameters and diagnostic thresholds.

**Request Body**:
```json
{
  "polePairs": 4,
  "statorResistanceRs": 0.45,
  "dAxisInductanceLd": 0.0035,
  "qAxisInductanceLq": 0.0035,
  "referenceFluxWb": 0.0850,
  "referenceTemperatureC": 20.0,
  "alphaPsiPerK": -0.0011,
  "warningThresholdPct": -3.5,
  "faultThresholdPct": -5.0,
  "recoveryThresholdPct": -2.8,
  "persistenceDurationS": 1.5
}
```

---

## 3. Telemetry Ingestion & Query
### `POST /api/telemetry`
Ingests a single telemetry frame, stores it in the database, checks for state changes, and broadcasts the frame to all active WebSocket and SSE clients.

**Request Body**:
```json
{
  "assetId": 1,
  "timestampMs": 1729272000000,
  "speedRpm": 1500.0,
  "temperatureC": 42.5,
  "idA": -0.15,
  "iqA": 4.25,
  "vdV": -12.4,
  "vqV": 85.3,
  "estimatedFluxWb": 0.0841,
  "healthyReferenceFluxWb": 0.0841,
  "residualPct": -1.05,
  "diagnosticState": "NORMAL",
  "reasonCode": "FLUX_LINKAGE_NOMINAL",
  "confidencePct": 92.0,
  "uncertainty": 0.08,
  "isSimulated": true
}
```

### `GET /api/assets/{id}/telemetry?page=0&size=50`
Returns paginated historical telemetry records sorted by timestamp descending.

### `GET /api/telemetry/recent?assetId=1&limit=60`
Returns the most recent $N$ telemetry samples for fast chart initialization.

---

## 4. Real-Time Streaming

### 4.1 Native WebSocket Endpoint
- **URL**: `ws://<host>:8080/ws/telemetry`
- **Protocol**: Raw JSON streaming of telemetry frames directly to connected browsers.

### 4.2 Server-Sent Events (SSE)
- **URL**: `http://<host>:8080/api/telemetry/stream`
- **MIME**: `text/event-stream`
- **Event Name**: `telemetry`

---

## 5. Synthetic Simulation & Test Sessions
### `POST /api/simulation/start`
Starts a background simulation thread generating synthetic PMSM telemetry.

**Request Body**:
```json
{
  "assetId": 1,
  "scenarioName": "synthetic_flux_reduction_10pct",
  "targetSpeedRpm": 1500.0,
  "loadTorqueNm": 2.0,
  "temperatureC": 35.0,
  "demagnetizationPct": 10.0,
  "currentOffsetA": 0.0,
  "voltageNoiseV": 0.2,
  "durationSeconds": 30,
  "randomSeed": 42
}
```

### `POST /api/simulation/stop`
Stops the currently executing simulation.

### `GET /api/test-sessions`
Lists all recorded test sessions.

### `GET /api/test-sessions/{id}/report`
Returns the quantitative verification report JSON for the selected session.
