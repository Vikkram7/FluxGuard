"""FluxGuard PMSM Simulation Package"""

from .pmsm_model import PMSMParameters, PMSMSimulator
from .estimator import FluxEstimator, EstimationResult
from .diagnostics import (
    DiagnosticState,
    DiagnosticConfig,
    HealthyReferenceModel,
    TemperatureCompensator,
    FluxResidualMonitor,
    DataQualityMonitor,
    DiagnosticStateMachine,
    DiagnosticSnapshot
)
from .scenarios import run_scenario, get_all_scenarios
