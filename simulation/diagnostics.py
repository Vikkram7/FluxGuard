"""
FluxGuard PMSM - Temperature Compensation and Diagnostic State Machine
Implements:
- HealthyReferenceModel
- TemperatureCompensator
- FluxResidualMonitor
- DataQualityMonitor
- DiagnosticStateMachine
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple
import numpy as np

from .pmsm_model import PMSMParameters
from .estimator import EstimationResult


class DiagnosticState(str, Enum):
    INITIALIZING = "INITIALIZING"
    NORMAL = "NORMAL"
    SUSPECTED_FLUX_DEGRADATION = "SUSPECTED_FLUX_DEGRADATION"
    UNCERTAIN = "UNCERTAIN"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    SENSOR_FAULT = "SENSOR_FAULT"


@dataclass
class DiagnosticConfig:
    """Configurable thresholds and persistence timing for diagnostic engine."""
    # Normalized residual thresholds (percentage, negative indicates flux deficit)
    warn_threshold_pct: float = -3.5       # Early alert threshold (%)
    fault_threshold_pct: float = -5.0      # Demagnetization suspicion entry threshold (%)
    recovery_threshold_pct: float = -2.8   # Hysteresis exit threshold (%)
    severe_fault_threshold_pct: float = -12.0 # High severity alert (%)

    # Persistence requirements
    persistence_time_s: float = 1.5        # Time residual must remain below fault threshold
    recovery_time_s: float = 2.0           # Time residual must remain above recovery threshold
    dt_sample_s: float = 0.01              # Execution sample interval

    # Quality monitor thresholds
    max_uncertainty: float = 0.65          # Beyond this uncertainty, mark UNCERTAIN
    max_d_residual_v: float = 12.0         # Max allowable d-axis discrepancy before SENSOR_FAULT
    min_speed_rpm: float = 60.0            # Below this speed, mark INSUFFICIENT_DATA
    max_speed_rpm: float = 4500.0          # Overspeed limit
    min_temp_c: float = -30.0              # Sensor range limits
    max_temp_c: float = 150.0

    @property
    def persistence_samples(self) -> int:
        return max(1, int(self.persistence_time_s / self.dt_sample_s))

    @property
    def recovery_samples(self) -> int:
        return max(1, int(self.recovery_time_s / self.dt_sample_s))


class HealthyReferenceModel:
    """
    Computes expected permanent-magnet flux for a healthy motor as a function of temperature:
        psi_healthy(T) = psi_ref * [1 + alpha_psi * (T - T_ref)]
    First-order approximation valid over the motor's calibrated thermal operating range.
    """

    def __init__(self, params: PMSMParameters = None):
        self.params = params or PMSMParameters()

    def get_healthy_flux(self, temperature_c: float) -> float:
        """Calculate temperature-compensated reference flux."""
        delta_t = temperature_c - self.params.T_ref
        thermal_factor = 1.0 + self.params.alpha_psi * delta_t
        # Thermal clamp to prevent non-physical zero/negative output
        thermal_factor = max(0.2, thermal_factor)
        return self.params.psi_f_ref * thermal_factor


class TemperatureCompensator:
    """
    Computes absolute and normalized flux residuals by comparing estimated flux
    against the healthy temperature-adjusted model.
    """

    def __init__(self, healthy_model: HealthyReferenceModel):
        self.healthy_model = healthy_model

    def compute_residual(self, psi_hat: float, temperature_c: float) -> Tuple[float, float, float]:
        """
        Returns:
            (psi_ref_healthy, raw_residual_wb, normalized_residual_pct)
        where:
            raw_residual = psi_hat - psi_healthy(T)
            normalized_residual_pct = (raw_residual / psi_healthy(T)) * 100.0
        """
        psi_healthy = self.healthy_model.get_healthy_flux(temperature_c)
        raw_res = psi_hat - psi_healthy
        norm_res_pct = (raw_res / psi_healthy) * 100.0
        return psi_healthy, raw_res, norm_res_pct


class FluxResidualMonitor:
    """
    Maintains rolling statistical analysis of the flux residual,
    including exponential moving average and noise variance.
    """

    def __init__(self, ema_alpha: float = 0.05):
        self.ema_alpha = ema_alpha
        self.mean_residual_pct: float = 0.0
        self.var_residual_pct: float = 0.0
        self.initialized: bool = False

    def update(self, norm_res_pct: float) -> Tuple[float, float]:
        """Updates rolling mean and standard deviation."""
        if not self.initialized:
            self.mean_residual_pct = norm_res_pct
            self.var_residual_pct = 0.0
            self.initialized = True
        else:
            diff = norm_res_pct - self.mean_residual_pct
            self.mean_residual_pct += self.ema_alpha * diff
            self.var_residual_pct = (1.0 - self.ema_alpha) * (self.var_residual_pct + self.ema_alpha * (diff ** 2))

        std_dev = float(np.sqrt(max(0.0, self.var_residual_pct)))
        return float(self.mean_residual_pct), std_dev

    def reset(self) -> None:
        self.initialized = False
        self.mean_residual_pct = 0.0
        self.var_residual_pct = 0.0


class DataQualityMonitor:
    """
    Evaluates sensor signal validity, operating envelope, and measurement consistency.
    """

    def __init__(self, config: DiagnosticConfig):
        self.config = config

    def check_quality(self,
                      est_result: EstimationResult,
                      speed_rpm: float,
                      temperature_c: float) -> Tuple[bool, str]:
        """
        Returns (is_acceptable, reason_code).
        """
        # Speed envelope
        if abs(speed_rpm) < self.config.min_speed_rpm:
            return False, "SPEED_BELOW_OPERATING_MINIMUM"
        if abs(speed_rpm) > self.config.max_speed_rpm:
            return False, "SPEED_OVERSPEED_LIMIT_EXCEEDED"

        # Temperature sensor envelope
        if temperature_c < self.config.min_temp_c or temperature_c > self.config.max_temp_c:
            return False, "TEMPERATURE_SENSOR_OUT_OF_RANGE"

        # High d-axis residual indicates sensor offset / wrong inductance
        if est_result.d_axis_residual > self.config.max_d_residual_v:
            return False, "EXCESSIVE_D_AXIS_VOLTAGE_ERROR"

        # Uncertainty ceiling
        if est_result.uncertainty > self.config.max_uncertainty:
            return False, "MEASUREMENT_UNCERTAINTY_EXCESSIVE"

        # Check estimator validity flag
        if not est_result.is_valid:
            return False, est_result.reason_code

        return True, "QUALITY_GOOD"


@dataclass
class DiagnosticSnapshot:
    """Full diagnostic snapshot at a point in time."""
    timestamp_s: float
    state: DiagnosticState
    speed_rpm: float
    temperature_c: float
    psi_hat: float
    psi_healthy: float
    raw_residual_wb: float
    norm_residual_pct: float
    smoothed_residual_pct: float
    uncertainty: float
    confidence_pct: float
    reason_code: str
    is_valid_operating_point: bool
    persistence_progress: float  # 0.0 to 1.0


class DiagnosticStateMachine:
    """
    Robust diagnostic state machine implementing hysteresis, persistence debounce,
    distinction between reversible thermal changes vs true degradation,
    and handling of invalid or inconclusive operating conditions.
    """

    def __init__(self, params: PMSMParameters = None, config: DiagnosticConfig = None):
        self.params = params or PMSMParameters()
        self.config = config or DiagnosticConfig()

        self.healthy_model = HealthyReferenceModel(self.params)
        self.compensator = TemperatureCompensator(self.healthy_model)
        self.residual_monitor = FluxResidualMonitor(ema_alpha=0.08)
        self.quality_monitor = DataQualityMonitor(self.config)

        self.current_state = DiagnosticState.INITIALIZING
        self.consecutive_fault_count: int = 0
        self.consecutive_recovery_count: int = 0
        self.warmup_samples_needed: int = 30
        self.sample_count: int = 0
        self.current_time_s: float = 0.0

    def reset(self) -> None:
        self.current_state = DiagnosticState.INITIALIZING
        self.consecutive_fault_count = 0
        self.consecutive_recovery_count = 0
        self.sample_count = 0
        self.current_time_s = 0.0
        self.residual_monitor.reset()

    def process_sample(self,
                       est_result: EstimationResult,
                       speed_rpm: float,
                       temperature_c: float,
                       timestamp_s: Optional[float] = None) -> DiagnosticSnapshot:
        """
        Process a single sensor/estimation sample and update the diagnostic state.
        """
        self.sample_count += 1
        if timestamp_s is not None:
            self.current_time_s = timestamp_s
        else:
            self.current_time_s += self.config.dt_sample_s

        # 1. Compute temperature-compensated residuals
        psi_healthy, raw_res, norm_res_pct = self.compensator.compute_residual(
            est_result.psi_hat, temperature_c
        )
        smoothed_res_pct, res_std = self.residual_monitor.update(norm_res_pct)

        # 2. Check signal and operating quality
        is_quality_good, quality_reason = self.quality_monitor.check_quality(
            est_result, speed_rpm, temperature_c
        )

        reason_code = quality_reason
        persistence_ratio = 0.0

        # 3. State machine transitions
        if self.sample_count < self.warmup_samples_needed:
            self.current_state = DiagnosticState.INITIALIZING
            reason_code = "WARMUP_FILTER_INITIALIZATION"
            confidence = 30.0

        elif not is_quality_good:
            # Operating condition not valid for reliable diagnosis
            if "SENSOR" in quality_reason or "EXCESSIVE_D_AXIS" in quality_reason:
                self.current_state = DiagnosticState.SENSOR_FAULT
                confidence = 85.0
            elif "SPEED" in quality_reason:
                self.current_state = DiagnosticState.INSUFFICIENT_DATA
                confidence = 90.0
            else:
                self.current_state = DiagnosticState.UNCERTAIN
                confidence = 50.0

            # Reset fault persistence when data quality is invalid
            self.consecutive_fault_count = max(0, self.consecutive_fault_count - 1)

        else:
            # Quality is good, evaluate flux degradation criteria
            # Check degradation threshold
            if smoothed_res_pct <= self.config.fault_threshold_pct:
                self.consecutive_fault_count += 1
                self.consecutive_recovery_count = 0
                persistence_ratio = min(1.0, self.consecutive_fault_count / self.config.persistence_samples)

                if self.consecutive_fault_count >= self.config.persistence_samples:
                    self.current_state = DiagnosticState.SUSPECTED_FLUX_DEGRADATION
                    reason_code = f"PERSISTENT_FLUX_DEFICIT_{abs(smoothed_res_pct):.1f}PCT"
                    # Confidence increases with persistence and lower uncertainty
                    confidence = float(np.clip(70.0 + 25.0 * (1.0 - est_result.uncertainty), 60.0, 95.0))
                else:
                    self.current_state = DiagnosticState.UNCERTAIN
                    reason_code = f"DEGRADATION_PERSISTENCE_PENDING_{self.consecutive_fault_count}/{self.config.persistence_samples}"
                    confidence = 55.0

            elif smoothed_res_pct >= self.config.recovery_threshold_pct:
                self.consecutive_recovery_count += 1
                self.consecutive_fault_count = 0

                if self.current_state == DiagnosticState.SUSPECTED_FLUX_DEGRADATION:
                    if self.consecutive_recovery_count >= self.config.recovery_samples:
                        self.current_state = DiagnosticState.NORMAL
                        reason_code = "RECOVERED_TO_HEALTHY_BAND"
                        confidence = 90.0
                    else:
                        reason_code = f"RECOVERY_HYSTERESIS_ACTIVE_{self.consecutive_recovery_count}/{self.config.recovery_samples}"
                        confidence = 70.0
                else:
                    self.current_state = DiagnosticState.NORMAL
                    reason_code = "FLUX_LINKAGE_NOMINAL"
                    confidence = float(np.clip(85.0 + 10.0 * (1.0 - est_result.uncertainty), 70.0, 99.0))

            else:
                # Inside hysteresis band (-5.0% to -2.8%)
                if self.current_state == DiagnosticState.SUSPECTED_FLUX_DEGRADATION:
                    reason_code = "PERSISTENT_FAULT_IN_HYSTERESIS_ZONE"
                    confidence = 75.0
                elif smoothed_res_pct <= self.config.warn_threshold_pct:
                    self.current_state = DiagnosticState.UNCERTAIN
                    reason_code = "MILD_FLUX_DEVIATION_ALERT"
                    confidence = 60.0
                else:
                    self.current_state = DiagnosticState.NORMAL
                    reason_code = "NORMAL_TOLERANCE_BAND"
                    confidence = 80.0

        return DiagnosticSnapshot(
            timestamp_s=self.current_time_s,
            state=self.current_state,
            speed_rpm=speed_rpm,
            temperature_c=temperature_c,
            psi_hat=est_result.psi_hat,
            psi_healthy=psi_healthy,
            raw_residual_wb=raw_res,
            norm_residual_pct=norm_res_pct,
            smoothed_residual_pct=smoothed_res_pct,
            uncertainty=est_result.uncertainty,
            confidence_pct=confidence,
            reason_code=reason_code,
            is_valid_operating_point=is_quality_good,
            persistence_progress=persistence_ratio
        )
