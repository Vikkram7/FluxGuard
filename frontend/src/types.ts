export type DiagnosticState =
  | 'INITIALIZING'
  | 'NORMAL'
  | 'SUSPECTED_FLUX_DEGRADATION'
  | 'UNCERTAIN'
  | 'INSUFFICIENT_DATA'
  | 'SENSOR_FAULT';

export interface TelemetryData {
  timestampMs: number;
  speedRpm: number;
  temperatureC: number;
  idA: number;
  iqA: number;
  vdV: number;
  vqV: number;
  estimatedFluxWb: number;
  healthyReferenceFluxWb: number;
  residualPct: number;
  diagnosticState: DiagnosticState;
  reasonCode: string;
  confidencePct: number;
  uncertainty: number;
  isSimulated: boolean;
}

export interface MotorConfiguration {
  id?: number;
  polePairs: number;
  statorResistanceRs: number;
  dAxisInductanceLd: number;
  qAxisInductanceLq: number;
  referenceFluxWb: number;
  referenceTemperatureC: number;
  alphaPsiPerK: number;
  inertiaJ?: number;
  viscousFrictionB?: number;
  vMax?: number;
  iMax?: number;
  samplingRateHz?: number;
  warningThresholdPct: number;
  faultThresholdPct: number;
  recoveryThresholdPct: number;
  persistenceDurationS: number;
  updatedAt?: string;
}

export interface MotorAsset {
  id: number;
  assetTag: string;
  modelName: string;
  serialNumber: string;
  ratedPowerKw: number;
  ratedSpeedRpm: number;
  status: string;
  isSimulated: boolean;
  configuration: MotorConfiguration;
}

export interface DiagnosticEvent {
  id: number;
  timestamp: string;
  previousState: DiagnosticState;
  newState: DiagnosticState;
  residualPct: number;
  speedRpm: number;
  temperatureC: number;
  confidencePct: number;
  reasonCode: string;
  acknowledged: boolean;
}

export interface TestSession {
  id: number;
  sessionName: string;
  scenarioType: string;
  startTime: string;
  endTime?: string;
  status: string;
  totalSamples: number;
  detectionLatencyMs: number;
  falsePositiveCount: number;
  meanEstimationErrorPct: number;
  syntheticDemagPct: number;
  randomSeed: number;
  reportJson?: string;
}

export interface SimulationParams {
  assetId: number;
  scenarioName: string;
  targetSpeedRpm: number;
  loadTorqueNm: number;
  temperatureC: number;
  demagnetizationPct: number;
  currentOffsetA: number;
  voltageNoiseV: number;
  tempBiasC: number;
  durationSeconds: number;
  randomSeed: number;
}
